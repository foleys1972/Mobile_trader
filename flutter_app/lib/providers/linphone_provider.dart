import 'package:flutter/foundation.dart';
import 'package:permission_handler/permission_handler.dart';
import '../models/call_info.dart';
import '../models/line_type.dart';
import '../services/linphone_service.dart';

class LinphoneProvider extends ChangeNotifier {
  final LinphoneService _linphoneService = LinphoneService();
  
  bool _isConnected = false;
  List<CallInfo> _activeCalls = [];
  List<CallInfo> _blockedCalls = [];
  String _connectionStatus = "Disconnected";
  
  // Getters
  bool get isConnected => _isConnected;
  List<CallInfo> get activeCalls => _activeCalls;
  List<CallInfo> get blockedCalls => _blockedCalls;
  String get connectionStatus => _connectionStatus;
  
  // Initialize Linphone
  Future<void> initialize() async {
    try {
      // Request microphone permission
      await Permission.microphone.request();
      
      // Initialize Linphone service
      await _linphoneService.initialize();
      
      _isConnected = true;
      _connectionStatus = "Connected";
      notifyListeners();
    } catch (e) {
      _isConnected = false;
      _connectionStatus = "Error: $e";
      notifyListeners();
    }
  }
  
  // Register with server
  Future<void> register(String server, String username, String password) async {
    try {
      await _linphoneService.register(server, username, password);
      _connectionStatus = "Registered";
      notifyListeners();
    } catch (e) {
      _connectionStatus = "Registration failed: $e";
      notifyListeners();
    }
  }
  
  // Make a call
  Future<void> makeCall(String address, LineType lineType) async {
    try {
      final callInfo = await _linphoneService.makeCall(address, lineType);
      _activeCalls.add(callInfo);
      notifyListeners();
    } catch (e) {
      // Handle error
      debugPrint("Call failed: $e");
    }
  }
  
  // Answer a call
  Future<void> answerCall(String callId) async {
    try {
      await _linphoneService.answerCall(callId);
      _updateCallStatus(callId, CallStatus.connected);
    } catch (e) {
      debugPrint("Answer call failed: $e");
    }
  }
  
  // End a call
  Future<void> endCall(String callId) async {
    try {
      await _linphoneService.endCall(callId);
      _activeCalls.removeWhere((call) => call.id == callId);
      notifyListeners();
    } catch (e) {
      debugPrint("End call failed: $e");
    }
  }
  
  // Mute a call
  Future<void> muteCall(String callId, bool muted) async {
    try {
      await _linphoneService.muteCall(callId, muted);
      _updateCallMute(callId, muted);
    } catch (e) {
      debugPrint("Mute call failed: $e");
    }
  }
  
  // Handle incoming call
  Future<bool> handleIncomingCall(String address, LineType lineType) async {
    try {
      final shouldAllow = await _linphoneService.handleIncomingCall(address, lineType);
      if (!shouldAllow) {
        _blockedCalls.add(CallInfo(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          address: address,
          lineType: lineType,
          status: CallStatus.blocked,
          startTime: DateTime.now(),
        ));
        notifyListeners();
      }
      return shouldAllow;
    } catch (e) {
      debugPrint("Handle incoming call failed: $e");
      return false;
    }
  }
  
  // Resume calls (when app becomes active)
  Future<void> resumeCalls() async {
    try {
      await _linphoneService.resumeCalls();
    } catch (e) {
      debugPrint("Resume calls failed: $e");
    }
  }
  
  // Pause calls (when app goes to background)
  Future<void> pauseCalls() async {
    try {
      await _linphoneService.pauseCalls();
    } catch (e) {
      debugPrint("Pause calls failed: $e");
    }
  }
  
  // Cleanup
  Future<void> cleanup() async {
    try {
      await _linphoneService.cleanup();
      _isConnected = false;
      _connectionStatus = "Disconnected";
      _activeCalls.clear();
      _blockedCalls.clear();
      notifyListeners();
    } catch (e) {
      debugPrint("Cleanup failed: $e");
    }
  }
  
  // Private helper methods
  void _updateCallStatus(String callId, CallStatus status) {
    final index = _activeCalls.indexWhere((call) => call.id == callId);
    if (index != -1) {
      _activeCalls[index] = _activeCalls[index].copyWith(status: status);
      notifyListeners();
    }
  }
  
  void _updateCallMute(String callId, bool muted) {
    final index = _activeCalls.indexWhere((call) => call.id == callId);
    if (index != -1) {
      _activeCalls[index] = _activeCalls[index].copyWith(isMuted: muted);
      notifyListeners();
    }
  }
}
