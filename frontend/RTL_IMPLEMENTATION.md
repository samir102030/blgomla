# RTL (Right-to-Left) Implementation for Arabic Language

## Overview
This document explains the RTL implementation for the EGY CHEM HUB application to support Arabic language properly.

## Implementation Details

### 1. Language Direction Hook
- **File**: `src/hooks/useLanguageDirection.ts`
- **Purpose**: Provides a centralized way to determine text direction and RTL status
- **Usage**: Import and use in any component that needs RTL support

```typescript
import { useLanguageDirection } from '../hooks/useLanguageDirection';

const { isRTL, dir, lang } = useLanguageDirection();
```

### 2. Updated Components

#### Core Layout Components
- **Navbar**: Updated to support RTL navigation and language selector
- **Footer**: Updated to support RTL text alignment and layout
- **Home Page**: Updated to support RTL direction

#### Product Components
- **Products Page**: Updated with RTL search, sorting, and layout
- **ProductCard**: Updated with RTL positioning and text alignment
- **ProductListItem**: Updated with RTL layout and button positioning
- **SearchBar**: Updated with RTL dropdown and input positioning

#### Home Components
- **HeroSlider**: Updated with RTL text positioning and animations
- **Marketplace**: Updated with RTL layout and text alignment

### 3. CSS Support
- **File**: `src/styles/rtl.css`
- **Purpose**: Global RTL styles for consistent behavior
- **Features**:
  - RTL text alignment
  - RTL form controls
  - RTL button layouts
  - RTL icon positioning

### 4. Theme Updates
- **File**: `src/theme.tsx`
- **Updates**: Added RTL support for form components and input fields

### 5. App Configuration
- **File**: `src/App.tsx`
- **Updates**: Added document direction and language attribute setting

## Key Features

### Text Direction
- Automatically switches between LTR (left-to-right) and RTL (right-to-left)
- Only applies RTL for Arabic language (`ar`)
- All other languages use LTR

### Layout Adjustments
- **Flexbox Direction**: Uses `row-reverse` for RTL layouts
- **Text Alignment**: Right-aligned text for Arabic
- **Positioning**: Icons and badges positioned correctly for RTL
- **Margins/Padding**: Adjusted spacing for RTL layout

### Component-Specific Changes

#### Navigation
- Language selector positioned correctly
- Navigation links flow in RTL direction
- Icons positioned on appropriate sides

#### Forms
- Input text aligned right for Arabic
- Labels positioned correctly
- Buttons with proper icon placement

#### Product Display
- Product cards with RTL layout
- Search functionality with RTL support
- Category filters with RTL positioning

## Usage Examples

### Basic RTL Support
```typescript
import { useLanguageDirection } from '../hooks/useLanguageDirection';

const MyComponent = () => {
  const { isRTL, dir } = useLanguageDirection();
  
  return (
    <Box dir={dir}>
      <Text textAlign={isRTL ? 'right' : 'left'}>
        Content here
      </Text>
    </Box>
  );
};
```

### Flexbox RTL Layout
```typescript
<Flex direction={isRTL ? 'row-reverse' : 'row'}>
  <Box>Item 1</Box>
  <Box>Item 2</Box>
</Flex>
```

### Conditional Positioning
```typescript
<Box
  position="absolute"
  left={isRTL ? undefined : 0}
  right={isRTL ? 0 : undefined}
>
  Content
</Box>
```

## Testing

### How to Test RTL
1. Change language to Arabic in the language selector
2. Verify text flows right-to-left
3. Check that layouts are properly mirrored
4. Ensure forms and inputs work correctly
5. Test navigation and menus

### Expected Behavior
- **Arabic Language**: Full RTL support with right-aligned text
- **Other Languages**: Standard LTR layout with left-aligned text
- **Mixed Content**: Proper handling of mixed RTL/LTR content

## Browser Support
- Modern browsers with CSS Grid and Flexbox support
- Internet Explorer 11+ (with polyfills if needed)
- Mobile browsers with RTL support

## Future Enhancements
- Support for additional RTL languages (Hebrew, Persian, etc.)
- Advanced typography for Arabic text
- RTL-specific animations and transitions
- Improved accessibility for RTL users 