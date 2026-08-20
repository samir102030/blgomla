import type { ComponentType, SVGProps } from "react";
import {
  ArchiveBoxIcon,
  BoltIcon,
  BriefcaseIcon,
  CameraIcon,
  ComputerDesktopIcon,
  CpuChipIcon,
  CubeIcon,
  DevicePhoneMobileIcon,
  FilmIcon,
  GlobeAltIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  PrinterIcon,
  PuzzlePieceIcon,
  RectangleGroupIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  SignalIcon,
  SpeakerWaveIcon,
  SquaresPlusIcon,
  TvIcon,
  VideoCameraIcon,
  WifiIcon,
} from "@heroicons/react/24/outline";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * The line icon that goes beside a category name.
 *
 * These used to be emoji, which read as decoration on a shop that sells network
 * switches to businesses — and rendered differently on every operating system,
 * so the same menu was a different menu depending on who opened it. Heroicons
 * are the set the dashboard already uses, they take a stroke colour from the
 * surrounding text, and they scale with it.
 *
 * Order matters: the specific patterns come first, so "PoE Switch" is matched
 * before the general "switch" and "Gaming Laptop" before "laptop".
 */
const ICON_RULES: Array<[RegExp, Icon]> = [
  // Cameras and surveillance
  [/dslr|mirrorless/i, CameraIcon],
  [/lens/i, MagnifyingGlassIcon],
  [/network camera|ip camera/i, VideoCameraIcon],
  [/turbo hd|surveillance/i, VideoCameraIcon],
  [/dvr|nvr/i, FilmIcon],
  [/video intercom|intercom/i, PhoneIcon],
  [/security/i, ShieldCheckIcon],
  [/camera|photo/i, CameraIcon],

  // Networking — routers
  [/3g\/?4g|lte|5g/i, SignalIcon],
  [/portable router|mobile wi-?fi/i, DevicePhoneMobileIcon],
  [/mesh/i, SquaresPlusIcon],
  [/range extender|extender/i, SignalIcon],
  [/xdsl|modem/i, PhoneIcon],
  [/access point|desktop ap/i, SignalIcon],
  [/router/i, GlobeAltIcon],

  // Networking — switches and wiring
  [/poe switch/i, BoltIcon],
  [/switch/i, RectangleGroupIcon],
  [/powerline/i, BoltIcon],
  [/usb to ethernet|ethernet/i, LinkIcon],

  // Adapters
  [/wi-?fi.*usb|wifi.*usb|usb.*adapter/i, SignalIcon],
  [/bluetooth/i, WifiIcon],
  [/pci-?e/i, PuzzlePieceIcon],
  [/usb type-?c hub|usb hub/i, LinkIcon],
  [/usb/i, LinkIcon],

  // Generic networking
  [/networking|wi-?fi|wifi/i, GlobeAltIcon],

  // Printing, sound and screens
  [/print|scan/i, PrinterIcon],
  [/audio|speaker|sound/i, SpeakerWaveIcon],
  [/\btv\b|television/i, TvIcon],

  // Computing
  [/gaming laptop/i, PuzzlePieceIcon],
  [/business laptop/i, BriefcaseIcon],
  [/laptop/i, ComputerDesktopIcon],
  [/processor|cpu/i, CpuChipIcon],
  [/graphics card|gpu/i, CpuChipIcon],
  [/monitor|display/i, ComputerDesktopIcon],
  [/storage|ssd|hdd/i, ArchiveBoxIcon],
  [/keyboard|mice|mouse/i, RectangleGroupIcon],
  [/component/i, CpuChipIcon],

  // Peripherals and racks
  [/peripheral|accessor/i, SpeakerWaveIcon],
  [/rack|server/i, ServerStackIcon],

  // Catch-alls
  [/computer|it\b/i, ComputerDesktopIcon],
];

export const getCategoryIcon = (name?: string): Icon => {
  if (!name) return CubeIcon;
  for (const [pattern, icon] of ICON_RULES) {
    if (pattern.test(name)) return icon;
  }
  return CubeIcon;
};
