enum LineType {
  hoot,
  ard,
  mrd,
}

extension LineTypeExtension on LineType {
  String get displayName {
    switch (this) {
      case LineType.hoot:
        return 'Hoot';
      case LineType.ard:
        return 'ARD';
      case LineType.mrd:
        return 'MRD';
    }
  }

  String get description {
    switch (this) {
      case LineType.hoot:
        return 'Always-on conference';
      case LineType.ard:
        return 'Auto Ring Down';
      case LineType.mrd:
        return 'Manual Ring Down';
    }
  }

  String get icon {
    switch (this) {
      case LineType.hoot:
        return 'speaker_group';
      case LineType.ard:
        return 'phone_callback';
      case LineType.mrd:
        return 'phone';
    }
  }
}
