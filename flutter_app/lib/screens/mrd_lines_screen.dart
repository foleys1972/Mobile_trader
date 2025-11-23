import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/line_manager_provider.dart';
import '../models/trading_line.dart';

class MRDLinesScreen extends StatelessWidget {
  const MRDLinesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<LineManagerProvider>(
      builder: (context, provider, child) {
        final lines = provider.mrdLines;
        
        if (lines.isEmpty) {
          return const Center(
            child: Text('No MRD Lines configured'),
          );
        }
        
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: lines.length,
          itemBuilder: (context, index) {
            final line = lines[index];
            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: ListTile(
                leading: Icon(
                  Icons.phone,
                  color: Theme.of(context).primaryColor,
                ),
                title: Text(line.name),
                subtitle: Text(line.number),
                trailing: _buildStatusChip(context, line.status),
              ),
            );
          },
        );
      },
    );
  }
  
  Widget _buildStatusChip(BuildContext context, LineStatus status) {
    Color color;
    String label;
    
    switch (status) {
      case LineStatus.active:
        color = Colors.green;
        label = 'Active';
        break;
      case LineStatus.ready:
        color = Colors.blue;
        label = 'Ready';
        break;
      case LineStatus.busy:
        color = Colors.orange;
        label = 'Busy';
        break;
      case LineStatus.inactive:
        color = Colors.grey;
        label = 'Inactive';
        break;
      case LineStatus.error:
        color = Colors.red;
        label = 'Error';
        break;
    }
    
    return Chip(
      label: Text(label, style: const TextStyle(fontSize: 12)),
      backgroundColor: color.withOpacity(0.2),
      labelStyle: TextStyle(color: color),
    );
  }
}

