import { extendTheme } from '@chakra-ui/react'

const theme = extendTheme({
  colors: {
    brand: {
      primary: '#C53030', 
    },
  },
  fonts: {
    heading: 'IBM Plex Sans, sans-serif',
    body: 'IBM Plex Sans, sans-serif',
  },
  direction: 'ltr', // Default direction, will be overridden by components
  components: {
    Box: {
      variants: {
        droplet: {
          borderRadius: "16px",
          borderBottomRightRadius: "0",
          bg: "white",
          boxShadow: "md",
        }
      }
    },
    Button: {
      variants: {
        solid: {
          bg: 'brand.primary',
          color: 'white',
          _hover: {
            bg: 'brand.primary',
            opacity: 0.9
          }
        },
        outline: {
          borderColor: 'brand.primary',
          color: 'brand.primary',
          _hover: {
            bg: 'transparent',
            opacity: 0.8
          }
        }
      }
    },
    Input: {
      variants: {
        filled: {
          field: {
            _focus: {
              borderColor: 'brand.primary',
              boxShadow: '0 0 0 1px var(--chakra-colors-brand-primary)',
            },
          },
        },
      },
    },
    Select: {
      variants: {
        filled: {
          field: {
            _focus: {
              borderColor: 'brand.primary',
              boxShadow: '0 0 0 1px var(--chakra-colors-brand-primary)',
            },
          },
        },
      },
    },
  },
  styles: {
    global: {
      'img': {
        maxWidth: '100%',
        height: 'auto',
      },
      // Make tables scroll on small screens
      'table': {
        width: '100%',
        borderCollapse: 'collapse',
      },
      '@media screen and (max-width: 768px)': {
        'table': {
          display: 'block',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        },
      },
    },
  }
})

export default theme