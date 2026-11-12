import Foundation

enum BreathPhase: CaseIterable, Sendable {
    case inhale
    case hold
    case exhale

    var title: String {
        switch self {
        case .inhale: "Breathe in"
        case .hold: "Hold"
        case .exhale: "Breathe out"
        }
    }

    /// Length of the phase in seconds.
    var duration: Int {
        switch self {
        case .inhale: 4
        case .hold: 4
        case .exhale: 6
        }
    }

    /// Scale of the breathing orb at the end of the phase.
    var targetScale: Double {
        switch self {
        case .inhale, .hold: 1.0
        case .exhale: 0.55
        }
    }

    var next: BreathPhase {
        switch self {
        case .inhale: .hold
        case .hold: .exhale
        case .exhale: .inhale
        }
    }
}
