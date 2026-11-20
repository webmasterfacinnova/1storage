import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Colors } from "../theme/colors";
import { driveService } from "../../services/drive.service";

export interface LargestFileItem {
  id: string;
  name: string;
  mimeType?: string;
  size?: number | string | null;
}

interface LargestFilesListProps {
  files: LargestFileItem[];
  loading: boolean;
  onSelectFile: (fileId: string) => void;
  onViewAllLargest: () => void;
}

export const LargestFilesList: React.FC<LargestFilesListProps> = ({
  files,
  loading,
  onSelectFile,
  onViewAllLargest,
}) => {
  if (loading) {
    return (
      <ActivityIndicator
        size="small"
        color={Colors.status.quotaNormal}
        style={styles.loader}
      />
    );
  }

  if (files.length === 0) {
    return (
      <Text style={styles.emptyText}>No se encontraron archivos grandes</Text>
    );
  }

  return (
    <View style={styles.fileList}>
      {files.map((file) => {
        const isFolder = file.mimeType?.includes("folder");
        const numericSize =
          typeof file.size === "string" ? Number(file.size) : file.size;

        return (
          <TouchableOpacity
            key={file.id}
            style={styles.fileCard}
            onPress={() => onSelectFile(file.id)}
          >
            <Text style={styles.fileIcon}>{isFolder ? "📁" : "📄"}</Text>
            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={1}>
                {file.name}
              </Text>
              <Text style={styles.fileSize}>
                {numericSize ? driveService.formatBytes(numericSize) : "—"}
              </Text>
            </View>
            <Text style={styles.fileArrow}>›</Text>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity style={styles.moreButton} onPress={onViewAllLargest}>
        <Text style={styles.moreText}>Ver todos los archivos más grandes</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  loader: {
    marginVertical: 16,
  },
  fileList: {
    marginBottom: 20,
  },
  fileCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  fileIcon: {
    marginRight: 12,
    fontSize: 20,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.text.headingShort,
  },
  fileSize: {
    fontSize: 13,
    color: Colors.text.body,
    marginTop: 2,
  },
  fileArrow: {
    fontSize: 20,
    color: Colors.border.chevronSoft,
  },
  moreButton: {
    padding: 12,
    alignItems: "center",
  },
  moreText: {
    color: Colors.providers.googleDriveAlt,
    fontSize: 14,
  },
  emptyText: {
    color: Colors.text.caption,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 20,
  },
});