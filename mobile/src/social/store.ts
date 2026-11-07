import { Session } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import { GameKind, GameProgress, dayOf, gameKinds, resultScore } from '../core/engine';
import { store as arcade } from '../store';
import { supabase } from './client';
import { Result } from './standings';

export type Profile = { id: string; name: string; friend_code: string };

const friendly = (message: string) => {
  if (message.includes('unknown code')) return "That code doesn't match anyone.";
  if (message.includes('own code')) return "That's your own code.";
  if (message.toLowerCase().includes('expired') || message.toLowerCase().includes('invalid')) return "That code didn't work. Check it, or send a new one.";
  if (message.toLowerCase().includes('rate limit')) return 'Too many tries. Wait a minute and try again.';
  return 'Something went wrong. Check your connection and try again.';
};

class SocialStore {
  readonly available = supabase !== null;
  session: Session | null = null;
  profile: Profile | null = null;
  friends: Profile[] = [];
  results: Result[] = [];
  loaded = false;
  private version = 0;
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  getVersion = () => this.version;
  private changed() {
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }

  start = () => {
    if (!supabase) return () => undefined;
    void supabase.auth.getSession().then(({ data }) => this.adopt(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // The client holds a lock during this callback, so loading has to wait until it returns.
      setTimeout(() => void this.adopt(session), 0);
    });
    return () => data.subscription.unsubscribe();
  };
  private adopt = async (session: Session | null) => {
    const sameUser = session?.user.id === this.session?.user.id;
    this.session = session;
    if (!session) { this.profile = null; this.friends = []; this.results = []; }
    else if (!sameUser || !this.profile) await this.refresh();
    this.loaded = true;
    this.changed();
  };

  sendCode = async (email: string) => {
    const { error } = await supabase!.auth.signInWithOtp({ email: email.trim().toLowerCase() });
    return error ? friendly(error.message) : null;
  };
  verifyCode = async (email: string, token: string) => {
    const { error } = await supabase!.auth.verifyOtp({ email: email.trim().toLowerCase(), token: token.trim(), type: 'email' });
    return error ? friendly(error.message) : null;
  };
  saveName = async (name: string) => {
    const id = this.session?.user.id;
    if (!id) return 'Sign in first.';
    const { error } = this.profile
      ? await supabase!.from('profiles').update({ name: name.trim() }).eq('id', id)
      : await supabase!.from('profiles').insert({ id, name: name.trim() });
    if (error) return friendly(error.message);
    await this.refresh();
    return null;
  };
  refresh = async (day = dayOf()) => {
    const id = this.session?.user.id;
    if (!supabase || !id) return;
    const [profiles, links, results] = await Promise.all([
      supabase.from('profiles').select('id, name, friend_code'),
      supabase.from('friends').select('friend_id'),
      supabase.from('results').select('user_id, game, score, label').eq('day', day),
    ]);
    const people = (profiles.data ?? []) as Profile[];
    const friendIds = new Set((links.data ?? []).map((link) => link.friend_id as string));
    this.profile = people.find((person) => person.id === id) ?? null;
    this.friends = people.filter((person) => friendIds.has(person.id));
    this.results = (results.data ?? []) as Result[];
    this.changed();
    if (this.profile) await this.postToday(day);
  };
  addFriend = async (code: string) => {
    const { error } = await supabase!.rpc('add_friend', { code });
    if (error) return friendly(error.message);
    await this.refresh();
    return null;
  };
  removeFriend = async (id: string) => {
    await supabase!.rpc('remove_friend', { other: id });
    await this.refresh();
  };
  signOut = async () => { await supabase!.auth.signOut(); };
  deleteAccount = async () => {
    const { error } = await supabase!.rpc('delete_account');
    if (error) return friendly(error.message);
    await supabase!.auth.signOut();
    return null;
  };

  /** Only today's games count, played today, so an archive replay or a late sign-in can't rewrite a leaderboard. */
  post = async (kind: GameKind, day: number, progress: GameProgress) => {
    const id = this.session?.user.id;
    if (!supabase || !id || !this.profile || day !== dayOf() || !progress.completed || progress.completedAt === null || dayOf(progress.completedAt) !== day) return;
    if (this.results.some((result) => result.user_id === id && result.game === kind)) return;
    const { score, label } = resultScore(kind, day, progress);
    const { error } = await supabase.from('results').upsert({ user_id: id, day, game: kind, score, label }, { onConflict: 'user_id,day,game', ignoreDuplicates: true });
    if (!error) this.results = [...this.results, { user_id: id, game: kind, score, label }];
    this.changed();
  };
  private postToday = async (day: number) => {
    for (const kind of gameKinds) await this.post(kind, day, arcade.progress(kind, day));
  };
}

export const social = new SocialStore();

export function useSocial() {
  useSyncExternalStore(social.subscribe, social.getVersion);
  return social;
}
