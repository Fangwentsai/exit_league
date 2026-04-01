import Cocoa
import Vision

let args = CommandLine.arguments
if args.count < 2 {
    print("Please provide an image path")
    exit(1)
}
let imagePath = args[1]
let url = URL(fileURLWithPath: imagePath)
guard let cgImage = NSImage(contentsOf: url)?.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    print("Failed to load image")
    exit(1)
}

let requestHandler = VNImageRequestHandler(cgImage: cgImage, options: [:])
let request = VNRecognizeTextRequest { (request, error) in
    guard let observations = request.results as? [VNRecognizedTextObservation] else {
        self.print("No text found")
        return
    }
    
    for observation in observations {
        if let topCandidate = observation.topCandidates(1).first {
            print(topCandidate.string)
        }
    }
}
request.recognitionLanguages = ["zh-Hant", "en-US"]

do {
    try requestHandler.perform([request])
} catch {
    print("Error: \(error)")
}
