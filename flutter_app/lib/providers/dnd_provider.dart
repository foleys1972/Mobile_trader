import 'package:flutter/foundation.dart';

/// DND (Do Not Disturb) Provider
class DNDProvider extends ChangeNotifier {
  bool _isEnabled = false;
  bool _isScheduled = false;
  DateTime? _scheduledStart;
  DateTime? _scheduledEnd;
  List<String> _allowedCallers = [];
  
  bool get isEnabled => _isEnabled;
  bool get isScheduled => _isScheduled;
  DateTime? get scheduledStart => _scheduledStart;
  DateTime? get scheduledEnd => _scheduledEnd;
  List<String> get allowedCallers => List.unmodifiable(_allowedCallers);
  
  /// Enable DND
  void enable() {
    _isEnabled = true;
    notifyListeners();
  }
  
  /// Disable DND
  void disable() {
    _isEnabled = false;
    notifyListeners();
  }
  
  /// Toggle DND
  void toggle() {
    _isEnabled = !_isEnabled;
    notifyListeners();
  }
  
  /// Schedule DND
  void schedule(DateTime start, DateTime end) {
    _isScheduled = true;
    _scheduledStart = start;
    _scheduledEnd = end;
    notifyListeners();
  }
  
  /// Clear schedule
  void clearSchedule() {
    _isScheduled = false;
    _scheduledStart = null;
    _scheduledEnd = null;
    notifyListeners();
  }
  
  /// Add allowed caller
  void addAllowedCaller(String address) {
    if (!_allowedCallers.contains(address)) {
      _allowedCallers.add(address);
      notifyListeners();
    }
  }
  
  /// Remove allowed caller
  void removeAllowedCaller(String address) {
    _allowedCallers.remove(address);
    notifyListeners();
  }
  
  /// Check if caller is allowed
  bool isCallerAllowed(String address) {
    return _allowedCallers.contains(address);
  }
  
  /// Check if call should be blocked
  bool shouldBlockCall(String address) {
    if (!_isEnabled) return false;
    if (isCallerAllowed(address)) return false;
    return true;
  }
}

