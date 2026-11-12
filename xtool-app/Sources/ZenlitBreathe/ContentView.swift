import SwiftUI

struct ContentView: View {
    @AppStorage("completedCycles") private var completedCycles = 0
    @AppStorage("totalSeconds") private var totalSeconds = 0

    @State private var isRunning = false
    @State private var phase: BreathPhase = .inhale
    @State private var secondsLeft = BreathPhase.inhale.duration
    @State private var scale = BreathPhase.exhale.targetScale
    @State private var sessionCycles = 0
    @State private var session: Task<Void, Never>?

    private let accent = Color(red: 0.376, green: 0.647, blue: 0.980) // Zenlit blue #60a5fa

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.02, green: 0.03, blue: 0.09), Color(red: 0.05, green: 0.10, blue: 0.24)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 28) {
                header
                Spacer(minLength: 0)
                orb
                Spacer(minLength: 0)
                stats
                startButton
            }
            .padding(24)
        }
        .onDisappear { stop() }
    }

    private var header: some View {
        VStack(spacing: 6) {
            Text("Zenlit Breathe")
                .font(.largeTitle.weight(.bold))
                .foregroundStyle(.white)
            Text("4 in · 4 hold · 6 out")
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.6))
        }
        .padding(.top, 12)
    }

    private var orb: some View {
        ZStack {
            ForEach(0..<3, id: \.self) { ring in
                Circle()
                    .fill(accent.opacity(0.10))
                    .scaleEffect(scale + Double(ring) * 0.14)
            }
            Circle()
                .fill(
                    RadialGradient(
                        colors: [.white.opacity(0.95), accent, accent.opacity(0.55)],
                        center: .center,
                        startRadius: 4,
                        endRadius: 150
                    )
                )
                .scaleEffect(scale)
                .shadow(color: accent.opacity(0.7), radius: 36)

            VStack(spacing: 4) {
                Text(isRunning ? phase.title : "Ready")
                    .font(.title2.weight(.semibold))
                Text(isRunning ? "\(secondsLeft)" : "Tap start")
                    .font(isRunning ? .system(size: 44, weight: .bold, design: .rounded) : .footnote)
                    .monospacedDigit()
                    .contentTransition(.numericText())
            }
            .foregroundStyle(Color(red: 0.03, green: 0.07, blue: 0.20))
        }
        .frame(width: 260, height: 260)
        .accessibilityElement(children: .combine)
    }

    private var stats: some View {
        HStack(spacing: 12) {
            StatTile(value: "\(sessionCycles)", label: "This session")
            StatTile(value: "\(completedCycles)", label: "All breaths")
            StatTile(value: "\(totalSeconds / 60)m", label: "Calm time")
        }
    }

    private var startButton: some View {
        Button {
            isRunning ? stop() : start()
        } label: {
            Text(isRunning ? "Stop" : "Start")
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(isRunning ? Color.white.opacity(0.14) : accent, in: Capsule())
                .foregroundStyle(.white)
        }
        .sensoryFeedback(.impact, trigger: isRunning)
    }

    private func start() {
        isRunning = true
        sessionCycles = 0
        session = Task { await run() }
    }

    private func stop() {
        session?.cancel()
        session = nil
        isRunning = false
        withAnimation(.easeInOut(duration: 0.8)) {
            scale = BreathPhase.exhale.targetScale
        }
    }

    private func run() async {
        var current = BreathPhase.inhale
        while !Task.isCancelled {
            phase = current
            secondsLeft = current.duration
            withAnimation(.easeInOut(duration: Double(current.duration))) {
                scale = current.targetScale
            }
            for _ in 0..<current.duration {
                do {
                    try await Task.sleep(for: .seconds(1))
                } catch {
                    return
                }
                totalSeconds += 1
                withAnimation { secondsLeft = max(secondsLeft - 1, 0) }
            }
            if current == .exhale {
                sessionCycles += 1
                completedCycles += 1
            }
            current = current.next
        }
    }
}

private struct StatTile: View {
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title3.weight(.bold))
                .monospacedDigit()
                .foregroundStyle(.white)
            Text(label)
                .font(.caption)
                .foregroundStyle(.white.opacity(0.6))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 16))
    }
}
