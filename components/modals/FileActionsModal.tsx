// components/modals/FileActionsModal.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { X, LucideIcon } from 'lucide-react-native';
import { Button } from '../common/Button';

export interface FileActionOption {
  id: string;
  label: string;
  icon?: LucideIcon;
  color?: string;
  textColor?: string;
  destructive?: boolean;
  onPress: () => void;
}

interface FileActionsModalProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  actions: FileActionOption[];
  onClose: () => void;
}

export const FileActionsModal: React.FC<FileActionsModalProps> = ({
  visible,
  title = 'Opciones del archivo',
  subtitle,
  actions,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#666666" />
            </TouchableOpacity>
          </View>

          <View style={styles.actionsContainer}>
            {actions.map((action) => {
              const IconComponent = action.icon;
              const isDestructive = action.destructive;
              const actionColor =
                action.color || (isDestructive ? '#d32f2f' : '#1a237e');

              return (
                <TouchableOpacity
                  key={action.id}
                  style={[
                    styles.actionRow,
                    isDestructive && styles.destructiveRow,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    onClose();
                    action.onPress();
                  }}
                >
                  {IconComponent && (
                    <View style={styles.actionIcon}>
                      <IconComponent size={20} color={actionColor} />
                    </View>
                  )}
                  <Text
                    style={[
                      styles.actionLabel,
                      { color: action.textColor || actionColor },
                    ]}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

         
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222222',
  },
  subtitle: {
    fontSize: 12,
    color: '#777777',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  actionsContainer: {
    paddingVertical: 12,
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
  },
  destructiveRow: {
    backgroundColor: '#fff5f5',
  },
  actionIcon: {
    marginRight: 12,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    marginTop: 4,
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 10,
  },
});

export default FileActionsModal;