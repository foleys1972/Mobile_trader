import 'line_type.dart';

enum LineStatus {
  active,
  inactive,
  ready,
  busy,
  error,
}

class TradingLine {
  final String id;
  final String name;
  final String number;
  final LineType type;
  final LineStatus status;
  final List<String> participants;

  const TradingLine({
    required this.id,
    required this.name,
    required this.number,
    required this.type,
    required this.status,
    this.participants = const [],
  });

  bool get isActive => status == LineStatus.active;

  TradingLine copyWith({
    String? id,
    String? name,
    String? number,
    LineType? type,
    LineStatus? status,
    List<String>? participants,
  }) {
    return TradingLine(
      id: id ?? this.id,
      name: name ?? this.name,
      number: number ?? this.number,
      type: type ?? this.type,
      status: status ?? this.status,
      participants: participants ?? this.participants,
    );
  }

  String get statusText {
    switch (status) {
      case LineStatus.active:
        return 'Active';
      case LineStatus.inactive:
        return 'Inactive';
      case LineStatus.ready:
        return 'Ready';
      case LineStatus.busy:
        return 'Busy';
      case LineStatus.error:
        return 'Error';
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'number': number,
      'type': type.name,
      'status': status.name,
      'participants': participants,
    };
  }

  factory TradingLine.fromJson(Map<String, dynamic> json) {
    return TradingLine(
      id: json['id'],
      name: json['name'],
      number: json['number'],
      type: LineType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => LineType.mrd,
      ),
      status: LineStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => LineStatus.ready,
      ),
      participants: List<String>.from(json['participants'] ?? []),
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is TradingLine && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() {
    return 'TradingLine(id: $id, name: $name, number: $number, type: $type)';
  }
}
