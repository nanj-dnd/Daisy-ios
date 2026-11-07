import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInRight, FadeOutLeft, useReducedMotion } from 'react-native-reanimated';
import { EstimateQuestion, displayNumber, editionNumber, estimateMultiple, estimatesFor, finishGame, parseEstimate } from '../core/engine';
import { useArcade } from '../store';
import { fonts } from '../theme';
import { Icon, InputRef } from '../ui';

const coral = '#FF5E3A', deep = '#D94E2E', yellow = '#FFDE59', cream = '#FFF8EE', ink = '#1A1F2B';

function evaluate(expression: string) {
  const parts = expression.match(/(\d*\.?\d+|[+\-×÷])/g);
  if (!parts) return null;
  const terms: number[] = [Number(parts[0])], signs: string[] = [];
  for (let index = 1; index + 1 < parts.length; index += 2) {
    const operator = parts[index], value = Number(parts[index + 1]);
    if (operator === '×') terms[terms.length - 1] *= value;
    else if (operator === '÷') terms[terms.length - 1] /= value;
    else { signs.push(operator); terms.push(value); }
  }
  const total = terms.slice(1).reduce((sum, value, index) => (signs[index] === '+' ? sum + value : sum - value), terms[0]);
  return Number.isFinite(total) ? Number(total.toPrecision(10)) : null;
}

function Calculator({ onUse }: { onUse: (value: string) => void }) {
  const [expression, setExpression] = useState('');
  const result = evaluate(expression);
  const press = (key: string) => {
    if (key === 'C') setExpression('');
    else if (key === '⌫') setExpression((value) => value.slice(0, -1));
    else setExpression((value) => value + key);
  };
  return (
    <Animated.View entering={FadeIn.duration(160)} style={styles.calculator}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.calcScreen}>{expression || '0'}</Text>
      {['789÷', '456×', '123-', '.0⌫+'].map((row) => (
        <View key={row} style={styles.calcRow}>
          {[...row].map((key) => (
            <Pressable key={key} onPress={() => press(key)} accessibilityRole="button" style={({ pressed }) => [styles.calcKey, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={styles.calcText}>{key}</Text>
            </Pressable>
          ))}
        </View>
      ))}
      <View style={styles.calcRow}>
        <Pressable onPress={() => press('C')} accessibilityRole="button" style={styles.calcKey}><Text style={styles.calcText}>C</Text></Pressable>
        <Pressable onPress={() => { if (result !== null) onUse(String(result)); }} disabled={result === null} accessibilityRole="button" style={[styles.calcUse, { opacity: result === null ? 0.5 : 1 }]}>
          <Text style={styles.calcUseText}>USE {result === null ? '' : displayNumber(result)}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

/** A log scale from a tenth of the answer to ten times it. No player data exists here, so it only ever shows you and the answer. */
function Landing({ guess, answer }: { guess: number; answer: number }) {
  const place = Math.max(0, Math.min(1, (Math.log10(guess / answer) + 1) / 2));
  return (
    <View style={styles.landing} accessible accessibilityLabel={`Your guess compared with the answer on a scale from ${displayNumber(answer / 10)} to ${displayNumber(answer * 10)}`}>
      <Text style={styles.kicker}>WHERE YOU LANDED</Text>
      <View style={styles.scale}>
        {Array.from({ length: 21 }, (_, index) => <View key={index} style={[styles.bar, { height: 8 + (10 - Math.abs(index - 10)) * 3.6 }]} />)}
        <View style={styles.answerLine} />
        <View style={[styles.youLine, { left: `${place * 100}%` }]}>
          <View style={styles.youTag}><Text style={styles.youText}>You</Text></View>
        </View>
      </View>
      <View style={styles.scaleLabels}>
        <Text style={styles.scaleText}>{displayNumber(answer / 10)}</Text>
        <View style={styles.centreLabel}><Text style={styles.scaleText}>{displayNumber(answer)}</Text><Text style={styles.scaleCaption}>ANSWER</Text></View>
        <Text style={styles.scaleText}>{displayNumber(answer * 10)}</Text>
      </View>
    </View>
  );
}

function Verdict({ guess, answer }: { guess: number; answer: number }) {
  const multiple = estimateMultiple(guess, answer);
  const close = multiple < 1.05;
  return <Text style={styles.verdict}>{close ? 'Spot on' : `${multiple.toFixed(2)}× ${guess > answer ? 'Too High' : 'Too Low'}`}</Text>;
}

function AnswerReview({ question, guess }: { question: EstimateQuestion; guess: number }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.review}>
      <View style={styles.guessed}>
        <Text style={styles.kicker}>YOU GUESSED</Text>
        <Text style={styles.guessValue}>{displayNumber(guess)}</Text>
      </View>
      <View style={styles.answer}>
        <Text style={styles.answerKicker}>ANSWER</Text>
        <Text style={styles.answerValue}>{displayNumber(question.answer)}</Text>
        <Text style={styles.answerUnit}>{question.unit[0].toUpperCase() + question.unit.slice(1)}</Text>
      </View>
      <View>
        <Text style={styles.kicker}>YOU LANDED</Text>
        <Verdict guess={guess} answer={question.answer} />
      </View>
      <Landing guess={guess} answer={question.answer} />
      <Pressable onPress={() => setOpen((value) => !value)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.napkin}>
        <View style={styles.napkinHead}>
          <Text style={styles.napkinTitle}>NAPKIN MATH</Text>
          <Icon name={open ? 'chevron.up' : 'chevron.down'} size={13} color="#FFFFFF" fallback="⌃" />
        </View>
        {open && <Text style={styles.napkinText}>{question.explanation}</Text>}
      </Pressable>
    </View>
  );
}

function CardHead({ day, middle }: { day: number; middle: string }) {
  return (
    <View style={styles.head}>
      <Text style={styles.brand}>Fermi</Text>
      <Text style={styles.round}>{middle}</Text>
      <Text style={styles.brand}>No. {String(editionNumber(day)).padStart(3, '0')}</Text>
    </View>
  );
}

export function EstimationGame({ day }: { day: number }) {
  const arcade = useArcade();
  const reduced = useReducedMotion();
  const progress = arcade.progress('estimation', day);
  const questions = estimatesFor(day);
  const [calculator, setCalculator] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<InputRef>(null);
  const awaiting = !progress.completed && progress.values.length === progress.round;
  const valid = parseEstimate(progress.pendingAnswer) !== null;

  useEffect(() => {
    if (!awaiting) return;
    const timer = setTimeout(() => input.current?.focus(), 450);
    return () => clearTimeout(timer);
  }, [progress.round, awaiting]);

  const submit = () => {
    const value = parseEstimate(progress.pendingAnswer);
    if (!awaiting || value === null) { setError('Enter a positive number, such as 1,250.'); return; }
    setError(''); setCalculator(false);
    arcade.update('estimation', day, (state) => {
      state.values.push(value); state.pendingAnswer = '';
      if (state.values.length === 3) finishGame(state, true);
    });
  };

  if (progress.completed) {
    const factors = progress.values.map((value, index) => estimateMultiple(value, questions[index].answer));
    const average = factors.reduce((sum, factor) => sum + factor, 0) / Math.max(1, factors.length);
    return (
      <View style={styles.card}>
        <CardHead day={day} middle="RESULT" />
        <Text style={styles.finalHead}>Your{'\n'}<Text style={styles.finalHand}>educated</Text>{'\n'}guesses.</Text>
        <View style={styles.final}>
          <Text style={styles.finalValue}>{average.toFixed(2)}×</Text>
          <Text style={styles.finalCaption}>Average error · Lower is better</Text>
        </View>
        {progress.values.map((guess, index) => (
          <View key={index} style={styles.reviewBlock}>
            <Text style={styles.finalQuestion}>{questions[index].question}</Text>
            <AnswerReview question={questions[index]} guess={guess} />
          </View>
        ))}
      </View>
    );
  }
  const question = questions[Math.min(progress.round, 2)];
  return (
    <View style={styles.card}>
      <CardHead day={day} middle={`Q${progress.round + 1}/3`} />
      <Animated.View key={progress.round} entering={reduced ? FadeIn : FadeInRight.duration(260)} exiting={reduced ? undefined : FadeOutLeft.duration(160)} style={styles.body}>
        {awaiting ? (
          <>
            <Text style={styles.question}>{question.question}</Text>
            <View style={styles.field}>
              <TextInput
                ref={input} value={progress.pendingAnswer} placeholder="your guess" placeholderTextColor="#FFFFFFA6" keyboardType="decimal-pad" selectionColor="#FFFFFF"
                accessibilityLabel="Your guess" style={styles.input}
                onChangeText={(value) => arcade.update('estimation', day, (state) => { state.pendingAnswer = value.slice(0, 100); })}
              />
              <Text style={styles.unit} numberOfLines={1}>{question.unit.toUpperCase()}</Text>
            </View>
            {error !== '' && <Text style={styles.error}>{error}</Text>}
            <View style={styles.actions}>
              <Pressable onPress={() => setCalculator((value) => !value)} accessibilityRole="button" accessibilityLabel="Calculator" accessibilityState={{ expanded: calculator }} style={styles.calcToggle}>
                <Icon name="plus.forwardslash.minus" size={19} color="#FFFFFF" fallback="±" />
              </Pressable>
              <Pressable onPress={submit} disabled={!valid} accessibilityRole="button" accessibilityLabel="Lock it in" style={[styles.lock, valid && styles.lockReady]}>
                <Text style={[styles.lockText, { color: valid ? coral : '#FFFFFFA6' }]}>LOCK IT IN ↵</Text>
              </Pressable>
            </View>
            {calculator && <Calculator onUse={(value) => arcade.update('estimation', day, (state) => { state.pendingAnswer = value; })} />}
          </>
        ) : (
          <>
            <AnswerReview question={question} guess={progress.values[progress.round]} />
            <Pressable onPress={() => arcade.update('estimation', day, (state) => { state.round += 1; state.pendingAnswer = ''; })} accessibilityRole="button" style={styles.next}>
              <Text style={styles.nextText}>QUESTION {progress.round + 2} →</Text>
            </Pressable>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const plain = { fontFamily: fonts.plain };
const styles = StyleSheet.create({
  card: { padding: 20, gap: 18, backgroundColor: coral, borderRadius: 28, borderCurve: 'continuous', shadowColor: '#000000', shadowOpacity: 0.3, shadowRadius: 26, shadowOffset: { width: 0, height: 16 } },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { ...plain, fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  round: { ...plain, fontSize: 12, fontWeight: '700', letterSpacing: 1, color: '#FFFFFF' },
  body: { gap: 18 },
  question: { ...plain, fontSize: 27, lineHeight: 29, fontWeight: '700', letterSpacing: -0.4, color: '#FFFFFF' },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 66, paddingHorizontal: 18, borderRadius: 16, backgroundColor: '#FFFFFF2E' },
  input: { ...plain, flex: 1, fontSize: 22, fontWeight: '700', color: '#FFFFFF', padding: 0 },
  unit: { ...plain, maxWidth: 120, fontSize: 13, fontWeight: '700', color: '#FFFFFFCC' },
  error: { ...plain, fontSize: 14, fontWeight: '600', color: yellow },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calcToggle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFFB3' },
  lock: { height: 50, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 25, borderWidth: 2, borderColor: '#FFFFFF80' },
  lockReady: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  lockText: { ...plain, fontSize: 14, fontWeight: '700', letterSpacing: 2.4 },
  calculator: { gap: 6, padding: 10, borderRadius: 16, backgroundColor: deep },
  calcScreen: { ...plain, fontSize: 24, fontWeight: '700', color: '#FFFFFF', textAlign: 'right', paddingHorizontal: 8, paddingVertical: 4 },
  calcRow: { flexDirection: 'row', gap: 6 },
  calcKey: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#FFFFFF24' },
  calcText: { ...plain, fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  calcUse: { flex: 3, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#FFFFFF' },
  calcUseText: { ...plain, fontSize: 14, fontWeight: '700', letterSpacing: 1, color: coral },
  review: { gap: 12 },
  reviewBlock: { gap: 10, paddingTop: 6 },
  guessed: { padding: 14, gap: 2, borderRadius: 14, backgroundColor: deep },
  kicker: { ...plain, fontSize: 12, fontWeight: '700', letterSpacing: 2, color: '#FFFFFFD9' },
  guessValue: { ...plain, fontSize: 25, fontWeight: '700', color: '#FFFFFF' },
  answer: { padding: 14, gap: 1, borderRadius: 14, backgroundColor: cream, borderWidth: 3, borderColor: yellow },
  answerKicker: { ...plain, fontSize: 12, fontWeight: '700', letterSpacing: 2, color: '#5C5F66' },
  answerValue: { ...plain, fontSize: 25, fontWeight: '700', color: ink },
  answerUnit: { ...plain, fontSize: 14, fontWeight: '600', color: '#5C5F66' },
  verdict: { ...plain, fontSize: 31, fontWeight: '700', letterSpacing: -0.5, color: yellow, marginTop: 2 },
  landing: { gap: 6 },
  scale: { height: 96, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { flex: 1, backgroundColor: '#FFFFFF4D', borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  answerLine: { position: 'absolute', left: '50%', top: 22, bottom: 0, width: 0, borderLeftWidth: 2, borderColor: '#FFFFFF', borderStyle: 'dashed' },
  youLine: { position: 'absolute', top: 22, bottom: 0, width: 2, backgroundColor: yellow },
  youTag: { position: 'absolute', top: -22, left: -17, width: 36, height: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 5, backgroundColor: yellow },
  youText: { ...plain, fontSize: 12, fontWeight: '700', color: ink },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  centreLabel: { alignItems: 'center' },
  scaleText: { ...plain, fontSize: 12, fontWeight: '700', color: '#FFFFFFD9' },
  scaleCaption: { ...plain, fontSize: 10, fontWeight: '700', letterSpacing: 1.6, color: '#FFFFFFA6' },
  napkin: { padding: 14, gap: 10, borderRadius: 14, backgroundColor: deep },
  napkinHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  napkinTitle: { ...plain, fontSize: 13, fontWeight: '700', letterSpacing: 2, color: '#FFFFFF' },
  napkinText: { ...plain, fontSize: 15, lineHeight: 22, color: '#FFFFFF' },
  next: { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 26, backgroundColor: '#FFFFFF' },
  nextText: { ...plain, fontSize: 14, fontWeight: '700', letterSpacing: 2.8, color: coral },
  finalHead: { ...plain, fontSize: 42, lineHeight: 42, fontWeight: '700', letterSpacing: -1, color: '#FFFFFF', textAlign: 'center' },
  finalHand: { fontFamily: fonts.hand, fontSize: 56, fontWeight: 'normal', letterSpacing: 1, color: yellow },
  final: { alignItems: 'center', gap: 2 },
  finalValue: { ...plain, fontSize: 46, fontWeight: '700', color: yellow },
  finalCaption: { ...plain, fontSize: 13, fontWeight: '700', color: '#FFFFFFD9' },
  finalQuestion: { ...plain, fontSize: 17, lineHeight: 21, fontWeight: '700', color: '#FFFFFF' },
});
