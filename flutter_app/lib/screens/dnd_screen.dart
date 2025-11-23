import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/dnd_provider.dart';

class DNDScreen extends StatelessWidget {
  const DNDScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<DNDProvider>(
      builder: (context, provider, child) {
        return Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Card(
                child: SwitchListTile(
                  title: const Text('Do Not Disturb'),
                  subtitle: Text(provider.isEnabled ? 'Enabled' : 'Disabled'),
                  value: provider.isEnabled,
                  onChanged: (value) {
                    if (value) {
                      provider.enable();
                    } else {
                      provider.disable();
                    }
                  },
                ),
              ),
              const SizedBox(height: 16),
              if (provider.isEnabled) ...[
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Allowed Callers',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        if (provider.allowedCallers.isEmpty)
                          const Text('No allowed callers')
                        else
                          ...provider.allowedCallers.map((caller) => 
                            Chip(
                              label: Text(caller),
                              onDeleted: () => provider.removeAllowedCaller(caller),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}

