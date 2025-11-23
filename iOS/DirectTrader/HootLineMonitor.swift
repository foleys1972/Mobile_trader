import Foundation
import SwiftUI
import UserNotifications
import AVFoundation

class HootLineMonitor: ObservableObject {
    static let shared = HootLineMonitor()
    
    @Published var monitoredLines: [String: HootLineStatus] = [:]
    @Published var audioActivity: [String: AudioActivity] = [:]
    @Published var isMonitoring = false
    
    private var audioLevelTimer: Timer?
    private var notificationCenter = UNUserNotificationCenter.current()
    
    private init() {
        setupNotificationCenter()
    }
    
    // MARK: - Monitoring Control
    
    func startMonitoring(lineId: String, lineNumber: String) {
        let status = HootLineStatus(
            lineId: lineId,
            lineNumber: lineNumber,
            isMonitoring: true,
            isMuted: true,
            startTime: Date()
        )
        
        monitoredLines[lineId] = status
        isMonitoring = true
        
        // Start audio level monitoring
        startAudioLevelMonitoring(for: lineId)
        
        // Show monitoring started notification
        showMonitoringNotification(lineId: lineId, started: true)
    }
    
    func stopMonitoring(lineId: String) {
        monitoredLines[lineId] = nil
        audioActivity[lineId] = nil
        
        // Stop audio level monitoring for this line
        stopAudioLevelMonitoring(for: lineId)
        
        // Check if any lines are still being monitored
        isMonitoring = !monitoredLines.isEmpty
        
        // Show monitoring stopped notification
        showMonitoringNotification(lineId: lineId, started: false)
    }
    
    func toggleMute(lineId: String) {
        guard var status = monitoredLines[lineId] else { return }
        
        status.isMuted.toggle()
        monitoredLines[lineId] = status
        
        // Update audio routing based on mute status
        updateAudioRouting(for: lineId, muted: status.isMuted)
    }
    
    // MARK: - Audio Level Monitoring
    
    private func startAudioLevelMonitoring(for lineId: String) {
        // Start monitoring audio levels from the hoot line
        audioLevelTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            self?.checkAudioLevels(for: lineId)
        }
    }
    
    private func stopAudioLevelMonitoring(for lineId: String) {
        audioLevelTimer?.invalidate()
        audioLevelTimer = nil
    }
    
    private func checkAudioLevels(for lineId: String) {
        // This would integrate with Linphone to get actual audio levels
        // For now, we'll simulate audio level detection
        
        // Simulate random audio activity for demonstration
        let hasAudio = Bool.random() && Double.random(in: 0...1) > 0.7
        
        if hasAudio {
            let activity = AudioActivity(
                lineId: lineId,
                timestamp: Date(),
                audioLevel: Double.random(in: 0.3...1.0),
                isSpeaking: true
            )
            
            audioActivity[lineId] = activity
            
            // Check if line is muted and show notification
            if let status = monitoredLines[lineId], status.isMuted {
                showSpeakingNotification(for: lineId, activity: activity)
            }
        } else {
            // Clear audio activity if no audio detected
            if audioActivity[lineId]?.timestamp.timeIntervalSinceNow < -2.0 {
                audioActivity[lineId] = nil
            }
        }
    }
    
    // MARK: - Audio Routing
    
    private func updateAudioRouting(for lineId: String, muted: Bool) {
        // This would integrate with Linphone to control audio routing
        if muted {
            // Route audio to null device (muted)
            print("Audio muted for line \(lineId)")
        } else {
            // Route audio to speaker/headphones
            print("Audio unmuted for line \(lineId)")
        }
    }
    
    // MARK: - Notifications
    
    private func setupNotificationCenter() {
        notificationCenter.requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if granted {
                print("Notification permission granted")
            } else {
                print("Notification permission denied: \(error?.localizedDescription ?? "Unknown error")")
            }
        }
    }
    
    private func showMonitoringNotification(lineId: String, started: Bool) {
        let content = UNMutableNotificationContent()
        content.title = started ? "Monitoring Started" : "Monitoring Stopped"
        content.body = started ? "You're now monitoring the hoot line (muted)" : "Hoot line monitoring stopped"
        content.sound = .default
        
        let request = UNNotificationRequest(
            identifier: "monitoring_\(lineId)_\(UUID().uuidString)",
            content: content,
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: 0.1, repeats: false)
        )
        
        notificationCenter.add(request)
    }
    
    private func showSpeakingNotification(for lineId: String, activity: AudioActivity) {
        guard let status = monitoredLines[lineId], status.isMuted else { return }
        
        let content = UNMutableNotificationContent()
        content.title = "Someone is Speaking"
        content.body = "Activity detected on hoot line \(status.lineNumber)"
        content.sound = UNNotificationSound(named: UNNotificationSoundName("hoot_activity.wav"))
        content.badge = 1
        
        // Add custom data
        content.userInfo = [
            "lineId": lineId,
            "lineNumber": status.lineNumber,
            "audioLevel": activity.audioLevel,
            "timestamp": activity.timestamp.timeIntervalSince1970
        ]
        
        let request = UNNotificationRequest(
            identifier: "speaking_\(lineId)_\(UUID().uuidString)",
            content: content,
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: 0.1, repeats: false)
        )
        
        notificationCenter.add(request)
    }
    
    // MARK: - Public Interface
    
    func getLineStatus(lineId: String) -> HootLineStatus? {
        return monitoredLines[lineId]
    }
    
    func getAudioActivity(lineId: String) -> AudioActivity? {
        return audioActivity[lineId]
    }
    
    func isLineMuted(lineId: String) -> Bool {
        return monitoredLines[lineId]?.isMuted ?? false
    }
    
    func clearAllMonitoring() {
        for lineId in monitoredLines.keys {
            stopMonitoring(lineId: lineId)
        }
    }
}

// MARK: - Supporting Types

struct HootLineStatus {
    let lineId: String
    let lineNumber: String
    var isMonitoring: Bool
    var isMuted: Bool
    let startTime: Date
    
    var monitoringDuration: TimeInterval {
        return Date().timeIntervalSince(startTime)
    }
    
    var statusText: String {
        if isMonitoring {
            return isMuted ? "Monitoring (Muted)" : "Active"
        } else {
            return "Not Monitoring"
        }
    }
    
    var statusColor: Color {
        if isMonitoring {
            return isMuted ? .orange : .green
        } else {
            return .gray
        }
    }
}

struct AudioActivity {
    let lineId: String
    let timestamp: Date
    let audioLevel: Double
    let isSpeaking: Bool
    
    var audioLevelText: String {
        if audioLevel > 0.8 {
            return "Loud"
        } else if audioLevel > 0.5 {
            return "Medium"
        } else {
            return "Quiet"
        }
    }
    
    var audioLevelColor: Color {
        if audioLevel > 0.8 {
            return .red
        } else if audioLevel > 0.5 {
            return .orange
        } else {
            return .green
        }
    }
}

// MARK: - Notification Extensions

extension HootLineMonitor {
    func handleNotificationResponse(_ response: UNNotificationResponse) {
        let userInfo = response.notification.request.content.userInfo
        
        guard let lineId = userInfo["lineId"] as? String else { return }
        
        switch response.actionIdentifier {
        case "UNMUTE_ACTION":
            toggleMute(lineId: lineId)
        case "JOIN_ACTION":
            // Join the hoot line (unmute and participate)
            if var status = monitoredLines[lineId] {
                status.isMuted = false
                monitoredLines[lineId] = status
            }
        case "STOP_MONITORING_ACTION":
            stopMonitoring(lineId: lineId)
        default:
            break
        }
    }
}
