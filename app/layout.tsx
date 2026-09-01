export const metadata = { title: "Literature Chat Demo" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <style>{`
          .msg p, .msg ul, .msg ol { margin: 0.45em 0; }
          .msg > *:first-child, .msg p:first-child { margin-top: 0; }
          .msg > *:last-child, .msg p:last-child { margin-bottom: 0; }
        `}</style>
        {children}
      </body>
    </html>
  );
}
