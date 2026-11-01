import AppKit
import ImageIO
import UniformTypeIdentifiers
let size = 1024
let cg = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: size * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
let context = NSGraphicsContext(cgContext: cg, flipped: false)
NSGraphicsContext.saveGraphicsState(); NSGraphicsContext.current = context
NSColor(red: 0.94, green: 0.97, blue: 1, alpha: 1).setFill(); NSRect(x: 0, y: 0, width: size, height: size).fill()
let cards: [(CGFloat, CGFloat, CGFloat, CGFloat, CGFloat)] = [(100, 330, 1, 0.43, 0.47), (170, 250, 1, 0.83, 0.30), (240, 170, 0.37, 0.86, 0.66), (310, 90, 0.035, 0.43, 0.83)]
for (x, y, r, g, b) in cards {
    NSColor(red: r * 0.78, green: g * 0.78, blue: b * 0.78, alpha: 1).setFill(); NSBezierPath(roundedRect: NSRect(x: x, y: y - 13, width: 590, height: 570), xRadius: 95, yRadius: 95).fill()
    NSColor(red: r, green: g, blue: b, alpha: 1).setFill(); NSBezierPath(roundedRect: NSRect(x: x, y: y, width: 590, height: 570), xRadius: 95, yRadius: 95).fill()
}
let font = NSFont.systemFont(ofSize: 400, weight: .black)
let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: NSColor.white]
("X" as NSString).draw(at: NSPoint(x: 460, y: 120), withAttributes: attrs)
NSGraphicsContext.restoreGraphicsState()
let output = CGImageDestinationCreateWithURL(URL(fileURLWithPath: CommandLine.arguments[1]) as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(output, cg.makeImage()!, nil)
CGImageDestinationFinalize(output)
