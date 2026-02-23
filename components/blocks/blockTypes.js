/**
 * Shared block type config for card editor and template editor.
 * Keys match block.type (string). Used by BlockEditor (edit) and BlockDisplay (read-only).
 */
import {
  Heading1,
  Heading2,
  Heading3,
  Type,
  FileText,
  EyeOff,
  Image as ImageIcon,
  Music,
  Minus,
  MoveVertical,
  CircleDot,
  CheckSquare,
  MessageSquare,
} from "lucide-react";

export const BLOCK_TYPES = {
  header1: {
    label: "Header 1",
    icon: Heading1,
    placeholder: "Main heading...",
  },
  header2: { label: "Header 2", icon: Heading2, placeholder: "Subheading..." },
  header3: {
    label: "Header 3",
    icon: Heading3,
    placeholder: "Small heading...",
  },
  text: { label: "Text", icon: Type, placeholder: "Enter text..." },
  example: {
    label: "Example",
    icon: FileText,
    placeholder: "Example or quote...",
  },
  hiddenText: {
    label: "Hidden Text",
    icon: EyeOff,
    placeholder: "Hidden until revealed...",
  },
  image: { label: "Image", icon: ImageIcon, placeholder: "Add images..." },
  audio: { label: "Audio", icon: Music, placeholder: "Add audio files..." },
  divider: { label: "Divider", icon: Minus, placeholder: "" },
  space: { label: "Space", icon: MoveVertical, placeholder: "" },
  quizSingleSelect: {
    label: "Quiz (Single)",
    icon: CircleDot,
    placeholder: "",
  },
  quizMultiSelect: {
    label: "Quiz (Multi)",
    icon: CheckSquare,
    placeholder: "",
  },
  quizTextAnswer: {
    label: "Quiz (Text)",
    icon: MessageSquare,
    placeholder: "",
  },
};

/** Block types that have editable text content (for "copy from block" in audio) */
export const TEXT_BLOCK_TYPES = new Set([
  "header1",
  "header2",
  "header3",
  "text",
  "example",
  "hiddenText",
]);
