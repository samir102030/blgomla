import React from "react";
import { HStack, Link } from "@chakra-ui/react";
import { IconType } from "react-icons";

interface SocialIcon {
  href: string;
  label: string;
  color: string;
  icon: IconType;
}

interface SocialMediaIconsProps {
  iconSize?: number;
  icons: SocialIcon[];
}

const SocialMediaIcons: React.FC<SocialMediaIconsProps> = ({
  iconSize = 48,
  icons,
}) => {
  if (!icons || icons.length === 0) return null;
  return (
    <HStack spacing={6} justify="center" mt={2}>
      {icons.map(({ href, label, color, icon: Icon }) => (
        <Link
          key={label}
          href={href}
          isExternal
          aria-label={label}
          sx={{
            color,
            transition: "transform 0.2s, box-shadow 0.2s, filter 0.2s",
            _hover: {
              transform: "scale(1.15)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
              filter: "brightness(0.85)",
              textDecoration: "none",
            },
          }}
        >
          {Icon &&
            React.createElement(Icon as React.ElementType, { size: iconSize })}
        </Link>
      ))}
    </HStack>
  );
};

export default SocialMediaIcons;
