// Pick a contextual emoji for a category name. Falls back to 📦 for unknown.
//
// Order matters: more specific patterns come first so "DSLR Cameras" matches
// before the generic "Cameras". Each entry is [regex, emoji].
const ICON_RULES: Array<[RegExp, string]> = [
  // Cameras
  [/dslr|mirrorless/i, "📸"],
  [/lens/i, "🔍"],
  [/network camera|ip camera/i, "📹"],
  [/turbo hd|surveillance/i, "📹"],
  [/dvr|nvr/i, "📼"],
  [/video intercom|intercom/i, "📞"],
  [/security/i, "🛡️"],
  [/camera|photo/i, "📷"],

  // Networking — routers
  [/3g\/?4g|lte|5g/i, "📶"],
  [/portable router|mobile wi-?fi/i, "📱"],
  [/mesh/i, "🕸️"],
  [/range extender|extender/i, "📡"],
  [/xdsl|modem/i, "📞"],
  [/access point|desktop ap/i, "📡"],
  [/router/i, "🌐"],

  // Networking — switches & wiring
  [/poe switch/i, "⚡"],
  [/switch/i, "🔀"],
  [/powerline/i, "🔌"],
  [/usb to ethernet|ethernet/i, "🔗"],

  // Adapters
  [/wi-?fi.*usb|wifi.*usb|usb.*adapter/i, "📶"],
  [/bluetooth/i, "🔵"],
  [/pci-?e/i, "🧩"],
  [/usb type-?c hub|usb hub/i, "🔌"],
  [/usb/i, "🔌"],

  // Generic networking
  [/networking|wi-?fi|wifi/i, "🌐"],

  // Computing
  [/gaming laptop/i, "🎮"],
  [/business laptop/i, "💼"],
  [/laptop/i, "💻"],
  [/processor|cpu/i, "🧠"],
  [/graphics card|gpu/i, "🎮"],
  [/monitor|display/i, "🖥️"],
  [/storage|ssd|hdd/i, "💾"],
  [/keyboard|mice|mouse/i, "⌨️"],
  [/component/i, "🔧"],

  // Peripherals & racks
  [/peripheral|accessor/i, "🎧"],
  [/rack|server/i, "🗄️"],

  // Catch-alls
  [/computer|it\b/i, "💻"],
];

export const getCategoryIcon = (name?: string): string => {
  if (!name) return "📦";
  for (const [pattern, emoji] of ICON_RULES) {
    if (pattern.test(name)) return emoji;
  }
  return "📦";
};
