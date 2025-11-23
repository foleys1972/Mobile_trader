import Foundation
import SwiftUI
import UserNotifications

class DNDManager: ObservableObject {
    static let shared = DNDManager()
    
    @Published var isDNDEnabled = false
    @Published var dndMode: DNDMode = .manual
    @Published var scheduledDNDStart: Date?
    @Published var scheduledDNDEnd: Date?
    @Published var allowedCallers: [String] = []
    @Published var emergencyOverride = true
    
    private let userDefaults = UserDefaults.standard
    private let dndKey = "dnd_enabled"
    private let dndModeKey = "dnd_mode"
    private let scheduledStartKey = "dnd_scheduled_start"
    private let scheduledEndKey = "dnd_scheduled_end"
    private let allowedCallersKey = "dnd_allowed_callers"
    private let emergencyOverrideKey = "dnd_emergency_override"
    
    private init() {
        loadDNDSettings()
        setupNotificationCenter()
    }
    
    // MARK: - DND Control Methods
    
    func toggleDND() {
        isDNDEnabled.toggle()
        saveDNDSettings()
        
        if isDNDEnabled {
            enableDND()
        } else {
            disableDND()
        }
    }
    
    func enableDND() {
        isDNDEnabled = true
        saveDNDSettings()
        
        // Notify LinphoneManager to block incoming calls
        NotificationCenter.default.post(name: .dndEnabled, object: nil)
        
        // Show DND status notification
        showDNDStatusNotification(enabled: true)
    }
    
    func disableDND() {
        isDNDEnabled = false
        saveDNDSettings()
        
        // Notify LinphoneManager to allow incoming calls
        NotificationCenter.default.post(name: .dndDisabled, object: nil)
        
        // Show DND status notification
        showDNDStatusNotification(enabled: false)
    }
    
    // MARK: - Scheduled DND
    
    func setScheduledDND(start: Date, end: Date) {
        scheduledDNDStart = start
        scheduledDNDEnd = end
        dndMode = .scheduled
        saveDNDSettings()
        
        // Schedule DND activation/deactivation
        scheduleDNDNotifications()
    }
    
    func cancelScheduledDND() {
        scheduledDNDStart = nil
        scheduledDNDEnd = nil
        dndMode = .manual
        saveDNDSettings()
        
        // Cancel scheduled notifications
        cancelScheduledNotifications()
    }
    
    // MARK: - Call Filtering
    
    func shouldBlockCall(from address: String, lineType: LineType) -> Bool {
        // Emergency calls always allowed if override is enabled
        if emergencyOverride && isEmergencyCall(address: address) {
            return false
        }
        
        // If DND is not enabled, allow all calls
        if !isDNDEnabled {
            return false
        }
        
        // Check if caller is in allowed list
        if allowedCallers.contains(address) {
            return false
        }
        
        // Block all other calls
        return true
    }
    
    func isEmergencyCall(address: String) -> Bool {
        // Check if the call is from an emergency line
        let emergencyNumbers = ["911", "999", "112", "000"]
        return emergencyNumbers.contains { address.contains($0) }
    }
    
    // MARK: - Allowed Callers Management
    
    func addAllowedCaller(_ address: String) {
        if !allowedCallers.contains(address) {
            allowedCallers.append(address)
            saveDNDSettings()
        }
    }
    
    func removeAllowedCaller(_ address: String) {
        allowedCallers.removeAll { $0 == address }
        saveDNDSettings()
    }
    
    func clearAllowedCallers() {
        allowedCallers.removeAll()
        saveDNDSettings()
    }
    
    // MARK: - Settings Management
    
    private func loadDNDSettings() {
        isDNDEnabled = userDefaults.bool(forKey: dndKey)
        
        if let modeString = userDefaults.string(forKey: dndModeKey),
           let mode = DNDMode(rawValue: modeString) {
            dndMode = mode
        }
        
        if let startTime = userDefaults.object(forKey: scheduledStartKey) as? Date {
            scheduledDNDStart = startTime
        }
        
        if let endTime = userDefaults.object(forKey: scheduledEndKey) as? Date {
            scheduledDNDEnd = endTime
        }
        
        if let callers = userDefaults.stringArray(forKey: allowedCallersKey) {
            allowedCallers = callers
        }
        
        emergencyOverride = userDefaults.bool(forKey: emergencyOverrideKey)
    }
    
    private func saveDNDSettings() {
        userDefaults.set(isDNDEnabled, forKey: dndKey)
        userDefaults.set(dndMode.rawValue, forKey: dndModeKey)
        userDefaults.set(scheduledDNDStart, forKey: scheduledStartKey)
        userDefaults.set(scheduledDNDEnd, forKey: scheduledEndKey)
        userDefaults.set(allowedCallers, forKey: allowedCallersKey)
        userDefaults.set(emergencyOverride, forKey: emergencyOverrideKey)
    }
    
    // MARK: - Notifications
    
    private func setupNotificationCenter() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(checkScheduledDND),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
    }
    
    @objc private func checkScheduledDND() {
        guard dndMode == .scheduled,
              let start = scheduledDNDStart,
              let end = scheduledDNDEnd else { return }
        
        let now = Date()
        
        if now >= start && now <= end && !isDNDEnabled {
            enableDND()
        } else if (now < start || now > end) && isDNDEnabled {
            disableDND()
        }
    }
    
    private func scheduleDNDNotifications() {
        guard let start = scheduledDNDStart,
              let end = scheduledDNDEnd else { return }
        
        // Request notification permissions
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { granted, error in
            if granted {
                self.createDNDNotifications(start: start, end: end)
            }
        }
    }
    
    private func createDNDNotifications(start: Date, end: Date) {
        let center = UNUserNotificationCenter.current()
        center.removeAllPendingNotificationRequests()
        
        // DND Start notification
        let startContent = UNMutableNotificationContent()
        startContent.title = "DND Activated"
        startContent.body = "Do Not Disturb is now active"
        startContent.sound = .default
        
        let startTrigger = UNCalendarNotificationTrigger(
            dateMatching: Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: start),
            repeats: false
        )
        
        let startRequest = UNNotificationRequest(
            identifier: "dnd_start",
            content: startContent,
            trigger: startTrigger
        )
        
        // DND End notification
        let endContent = UNMutableNotificationContent()
        endContent.title = "DND Deactivated"
        endContent.body = "Do Not Disturb has ended"
        endContent.sound = .default
        
        let endTrigger = UNCalendarNotificationTrigger(
            dateMatching: Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: end),
            repeats: false
        )
        
        let endRequest = UNNotificationRequest(
            identifier: "dnd_end",
            content: endContent,
            trigger: endTrigger
        )
        
        center.add(startRequest)
        center.add(endRequest)
    }
    
    private func cancelScheduledNotifications() {
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
    }
    
    private func showDNDStatusNotification(enabled: Bool) {
        let content = UNMutableNotificationContent()
        content.title = enabled ? "DND Enabled" : "DND Disabled"
        content.body = enabled ? "Incoming calls will be blocked" : "Incoming calls are now allowed"
        content.sound = .default
        
        let request = UNNotificationRequest(
            identifier: "dnd_status_\(UUID().uuidString)",
            content: content,
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: 0.1, repeats: false)
        )
        
        UNUserNotificationCenter.current().add(request)
    }
}

// MARK: - Supporting Types

enum DNDMode: String, CaseIterable {
    case manual = "manual"
    case scheduled = "scheduled"
    case automatic = "automatic"
    
    var displayName: String {
        switch self {
        case .manual:
            return "Manual"
        case .scheduled:
            return "Scheduled"
        case .automatic:
            return "Automatic"
        }
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let dndEnabled = Notification.Name("dndEnabled")
    static let dndDisabled = Notification.Name("dndDisabled")
}
