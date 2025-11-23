import 'package:flutter/foundation.dart';
import 'line_type.dart';

enum CallStatus {
  incoming,
  outgoing,
  connecting,
  connected,
  ended,
  blocked,
}

class CallInfo {
  final String id;
  final String address;
  final LineType lineType;
  final CallStatus status;
  final DateTime startTime;
  final bool isMuted;
  final String? reason;

  const CallInfo({
    required this.id,
    required this.address,
    required this.lineType,
    required this.status,
    required this.startTime,
    this.isMuted = false,
    this.reason,
  });

  CallInfo copyWith({
    String? id,
    String? address,
    LineType? lineType,
    CallStatus? status,
    DateTime? startTime,
    bool? isMuted,
    String? reason,
  }) {
    return CallInfo(
      id: id ?? this.id,
      address: address ?? this.address,
      lineType: lineType ?? this.lineType,
      status: status ?? this.status,
      startTime: startTime ?? this.startTime,
      isMuted: isMuted ?? this.isMuted,
      reason: reason ?? this.reason,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'address': address,
      'lineType': lineType.name,
      'status': status.name,
      'startTime': startTime.toIso8601String(),
      'isMuted': isMuted,
      'reason': reason,
    };
  }

  factory CallInfo.fromJson(Map<String, dynamic> json) {
    return CallInfo(
      id: json['id'],
      address: json['address'],
      lineType: LineType.values.firstWhere(
        (e) => e.name == json['lineType'],
        orElse: () => LineType.mrd,
      ),
      status: CallStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => CallStatus.outgoing,
      ),
      startTime: DateTime.parse(json['startTime']),
      isMuted: json['isMuted'] ?? false,
      reason: json['reason'],
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is CallInfo && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() {
    return 'CallInfo(id: $id, address: $address, lineType: $lineType, status: $status)';
  }
}
