import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { LetterContent } from "./letter-content";

// Built-in Helvetica covers Latin-1, so Spanish accents and ¿ ¡ render without
// embedding a font.
const styles = StyleSheet.create({
  page: { padding: 56, fontFamily: "Helvetica", fontSize: 11, lineHeight: 1.45, color: "#111" },
  block: { marginBottom: 14 },
  bold: { fontFamily: "Helvetica-Bold" },
  item: { marginBottom: 12 },
  itemLine: { marginBottom: 4 },
  muted: { color: "#444" },
  footer: { position: "absolute", left: 56, right: 56, bottom: 28, fontSize: 9, color: "#555" },
});

function Lines({ lines }: { lines: string[] }) {
  return (
    <View>
      {lines.map((line, i) => (
        <Text key={i}>{line}</Text>
      ))}
    </View>
  );
}

/** The dispute letter as a PDF. All text arrives resolved in `content`. */
export function LetterPdf({ content }: { content: LetterContent }) {
  return (
    <Document language={content.locale} title={content.subject}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.block}>
          <Lines lines={content.sender} />
        </View>
        <Text style={styles.block}>{content.date}</Text>
        <View style={styles.block}>
          <Lines lines={content.recipient} />
        </View>
        <View style={styles.block}>
          <Text style={styles.bold}>{content.subject}</Text>
          <Text>{content.account}</Text>
        </View>
        <Text style={styles.block}>{content.salutation}</Text>
        <Text style={styles.block}>{content.intro}</Text>
        <Text style={[styles.block, styles.bold]}>{content.itemsHeading}</Text>
        {content.items.map((item) => (
          <View key={item.number} style={styles.item} wrap={false}>
            <Text style={styles.bold}>{item.number}.</Text>
            {item.lines.map((line, i) => (
              <View key={i} style={styles.itemLine}>
                <Text>{line.heading}</Text>
                <Text style={styles.muted}>
                  {line.date} | {line.charge}
                </Text>
              </View>
            ))}
            <Text>{item.amountInQuestion}</Text>
            <Text>{item.reason}</Text>
          </View>
        ))}
        <Text style={styles.block}>{content.response}</Text>
        <Text style={styles.block}>{content.closing}</Text>
        <Text>{content.sincerely}</Text>
        <Text style={styles.block}>{content.signature}</Text>
        <Text style={styles.footer} fixed>
          {content.footer}
        </Text>
      </Page>
    </Document>
  );
}
