import Foundation
import linphone
import AVFoundation

class LinphoneManager: ObservableObject {
    static let shared = LinphoneManager()
    
    @Published var isConnected = false
    @Published var activeCalls: [CallInfo] = []
    @Published var connectionStatus = "Disconnected"
    @Published var blockedCalls: [BlockedCallInfo] = []
    
    private var core: OpaquePointer?
    private var coreDelegate: LinphoneCoreDelegate?
    private var dndManager = DNDManager.shared
    
    private init() {
        setupDNDNotifications()
    }
    
    func initialize() {
        // Initialize Linphone core
        let config = linphone_factory_create_config(linphone_factory_get())
        linphone_config_set_string(config, "sip", "user_agent", "DirectTrader/1.0")
        linphone_config_set_string(config, "sip", "register", "yes")
        
        // Configure for trading environment
        linphone_config_set_string(config, "sound", "capture_device", "iPhone Microphone")
        linphone_config_set_string(config, "sound", "playback_device", "iPhone Speaker")
        linphone_config_set_int(config, "sound", "sample_rate", 16000)
        
        // Enable echo cancellation for trading floors
        linphone_config_set_string(config, "sound", "echo_cancellation", "yes")
        linphone_config_set_string(config, "sound", "agc", "yes")
        
        core = linphone_core_new_with_config(config, nil, nil)
        
        // Set up core delegate
        coreDelegate = LinphoneCoreDelegate()
        linphone_core_add_listener(core, coreDelegate)
        
        // Configure for Oracle SBC integration
        configureOracleSBC()
        
        isConnected = true
        connectionStatus = "Connected"
    }
    
    private func configureOracleSBC() {
        // Oracle SBC specific configuration
        let config = linphone_core_get_config(core)
        linphone_config_set_string(config, "sip", "transport", "tls")
        linphone_config_set_int(config, "sip", "sip_port", 5061)
        linphone_config_set_string(config, "sip", "tls_cert_path", "")
        linphone_config_set_string(config, "sip", "tls_cert_key_path", "")
    }
    
    func register(server: String, username: String, password: String) {
        guard let core = core else { return }
        
        let identity = "sip:\(username)@\(server)"
        let authInfo = linphone_auth_info_new(username, nil, password, nil, nil, nil)
        linphone_core_add_auth_info(core, authInfo)
        
        let address = linphone_address_new(identity)
        linphone_core_set_primary_identity(core, address)
        
        let proxyConfig = linphone_proxy_config_new()
        linphone_proxy_config_set_identity_address(proxyConfig, address)
        linphone_proxy_config_set_server_addr(proxyConfig, "sip:\(server)")
        linphone_proxy_config_enable_register(proxyConfig, true)
        
        linphone_core_add_proxy_config(core, proxyConfig)
        linphone_core_set_default_proxy_config(core, proxyConfig)
    }
    
    func makeCall(to address: String, lineType: LineType) {
        guard let core = core else { return }
        
        // Check DND status before making call
        if dndManager.isDNDEnabled && !dndManager.allowedCallers.contains(address) {
            // Log blocked outgoing call
            let blockedCall = BlockedCallInfo(
                id: UUID().uuidString,
                address: address,
                lineType: lineType,
                reason: "DND Enabled",
                timestamp: Date()
            )
            blockedCalls.append(blockedCall)
            return
        }
        
        let callParams = linphone_core_create_call_params(core, nil)
        
        // Configure call parameters based on line type
        switch lineType {
        case .hoot:
            // Hoot lines are always-on conference calls
            linphone_call_params_enable_audio(callParams, true)
            linphone_call_params_set_audio_direction(callParams, .sendRecv)
        case .ard:
            // ARD lines with warning tone
            linphone_call_params_enable_audio(callParams, true)
            playWarningTone()
        case .mrd:
            // MRD lines with traditional ring
            linphone_call_params_enable_audio(callParams, true)
        }
        
        let call = linphone_core_invite_address_with_params(core, linphone_address_new(address), callParams)
        
        if let call = call {
            let callInfo = CallInfo(
                id: UUID().uuidString,
                address: address,
                lineType: lineType,
                status: .outgoing,
                startTime: Date()
            )
            activeCalls.append(callInfo)
        }
    }
    
    func answerCall(callId: String) {
        // Implementation for answering calls
        if let callInfo = activeCalls.first(where: { $0.id == callId }) {
            // Answer the call using Linphone core
            // This would integrate with the actual Linphone call handling
        }
    }
    
    func endCall(callId: String) {
        if let index = activeCalls.firstIndex(where: { $0.id == callId }) {
            activeCalls.remove(at: index)
        }
    }
    
    func muteCall(callId: String, muted: Bool) {
        if let callInfo = activeCalls.first(where: { $0.id == callId }) {
            // Toggle mute for the call
            // Implementation would use Linphone core to mute/unmute
        }
    }
    
    private func playWarningTone() {
        // Play warning tone for ARD lines
        // Implementation would use AVAudioPlayer to play warning tone
    }
    
    func resumeCalls() {
        // Resume all active calls when app becomes active
    }
    
    func pauseCalls() {
        // Pause calls when app goes to background
    }
    
    func enterBackground() {
        // Handle background mode for continuous calls
    }
    
    func cleanup() {
        if let core = core {
            linphone_core_destroy(core)
        }
        isConnected = false
        connectionStatus = "Disconnected"
    }
    
    // MARK: - DND Integration
    
    private func setupDNDNotifications() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(dndEnabled),
            name: .dndEnabled,
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(dndDisabled),
            name: .dndDisabled,
            object: nil
        )
    }
    
    @objc private func dndEnabled() {
        // Handle DND enabled - block incoming calls
        print("DND enabled - incoming calls will be blocked")
    }
    
    @objc private func dndDisabled() {
        // Handle DND disabled - allow incoming calls
        print("DND disabled - incoming calls are now allowed")
    }
    
    func handleIncomingCall(from address: String, lineType: LineType) -> Bool {
        // Check if call should be blocked by DND
        if dndManager.shouldBlockCall(from: address, lineType: lineType) {
            // Log blocked incoming call
            let blockedCall = BlockedCallInfo(
                id: UUID().uuidString,
                address: address,
                lineType: lineType,
                reason: "DND Enabled",
                timestamp: Date()
            )
            blockedCalls.append(blockedCall)
            return false // Block the call
        }
        
        return true // Allow the call
    }
    
    func getBlockedCalls() -> [BlockedCallInfo] {
        return blockedCalls
    }
    
    func clearBlockedCalls() {
        blockedCalls.removeAll()
    }
}

// MARK: - Supporting Types

struct CallInfo: Identifiable {
    let id: String
    let address: String
    let lineType: LineType
    var status: CallStatus
    let startTime: Date
}

enum CallStatus {
    case incoming
    case outgoing
    case connected
    case ended
}

enum LineType: String, CaseIterable {
    case hoot = "Hoot"
    case ard = "ARD"
    case mrd = "MRD"
    
    var description: String {
        switch self {
        case .hoot:
            return "Always-on conference"
        case .ard:
            return "Auto Ring Down"
        case .mrd:
            return "Manual Ring Down"
        }
    }
}

struct BlockedCallInfo: Identifiable {
    let id: String
    let address: String
    let lineType: LineType
    let reason: String
    let timestamp: Date
    
    var timeAgo: String {
        let interval = Date().timeIntervalSince(timestamp)
        if interval < 60 {
            return "Just now"
        } else if interval < 3600 {
            return "\(Int(interval / 60))m ago"
        } else {
            return "\(Int(interval / 3600))h ago"
        }
    }
}

// MARK: - Linphone Core Delegate

class LinphoneCoreDelegate: NSObject {
    // Implementation of Linphone core delegate methods
    // This would handle call state changes, registration status, etc.
}

