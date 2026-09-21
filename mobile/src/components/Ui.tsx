import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { card, danger, ink, line, mute, paper, shift, volt } from "../theme";

type BtnProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "volt" | "shift" | "ghost" | "danger";
};

export function Btn({ label, onPress, disabled, tone = "volt" }: BtnProps) {
  const bg = tone === "volt" ? volt : tone === "shift" ? shift : "transparent";
  const color = tone === "volt" ? ink : paper;
  const border = tone === "ghost" || tone === "danger" ? line : "transparent";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.45 : pressed ? 0.82 : 1 },
        tone === "danger" ? { borderColor: danger } : null,
      ]}
    >
      <Text style={[styles.btnText, { color: tone === "danger" ? danger : color }]}>{label}</Text>
    </Pressable>
  );
}

export function Field(props: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secure?: boolean;
  autoCapitalize?: "none" | "sentences";
  keyboardType?: "email-address" | "default";
}) {
  return (
    <TextInput
      style={styles.input}
      placeholder={props.placeholder}
      placeholderTextColor={mute}
      value={props.value}
      onChangeText={props.onChangeText}
      secureTextEntry={props.secure}
      autoCapitalize={props.autoCapitalize ?? "none"}
      keyboardType={props.keyboardType ?? "default"}
      autoCorrect={false}
    />
  );
}

export function Chip({ label, accent = "volt" }: { label: string; accent?: "volt" | "shift" | "mute" }) {
  const color = accent === "shift" ? shift : accent === "mute" ? mute : volt;
  return (
    <View style={[styles.chip, { borderColor: color }]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  btnText: { fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", fontSize: 14 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: card,
    color: paper,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  chip: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, alignSelf: "flex-start" },
  chipText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
});
