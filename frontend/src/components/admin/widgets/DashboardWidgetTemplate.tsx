import { Box, Flex, Text } from '@chakra-ui/react';
import { ReactNode } from 'react';

interface DashboardWidgetTemplateProps {
  title: string;
  value: string;
  additionalValue?: string;
  icon: ReactNode; // SVG icon as JSX
  circleColor: string; // Color for inner circle and dashed border
  backgroundColor?: string; // Optional background color (defaults to white)
  valueColor?: string; // Color for the main value (defaults to #900414)
  additionalValueColor?: string; // Color for additional value (defaults to #900414)
}

const DashboardWidgetTemplate = ({
  title,
  value,
  additionalValue,
  icon,
  circleColor,
  backgroundColor = "#fff",
  valueColor = "#900414",
  additionalValueColor = "#900414"
}: DashboardWidgetTemplateProps) => (
  <Box bg={backgroundColor} borderRadius="xl" p={5} border="1.5px solid #E9ECEF" minW="220px">
    <Flex align="center" gap={4}>
      <Box position="relative" w="56px" h="56px">
        {/* Inner solid circle */}
        <Box 
          position="absolute" 
          top={0} 
          left={0} 
          w="56px" 
          h="56px" 
          borderRadius="full" 
          bg={circleColor}
          display="flex" 
          alignItems="center" 
          justifyContent="center" 
          zIndex={1}
        >
          {icon}
        </Box>
        
        {/* Dashed border circle */}
        <Box position="absolute" top={0} left={0} w="56px" h="56px" borderRadius="full" zIndex={2} pointerEvents="none">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <circle 
              cx="28" 
              cy="28" 
              r="26" 
              stroke={circleColor}
              strokeWidth="2" 
              strokeDasharray="4 4" 
            />
          </svg>
        </Box>
      </Box>
      
      <Box flex={1}>
        <Text fontWeight={400} color="#222" fontSize="18px" mb={1} fontFamily="IBM Plex Sans">
          {title}
        </Text>
        <Flex align="center" gap={2}>
          <Text fontSize="22px" fontWeight={700} color={valueColor} fontFamily="IBM Plex Sans">
            {value}
          </Text>
          {additionalValue && (
            <Text fontSize="16px" color={additionalValueColor} fontWeight={500} fontFamily="IBM Plex Sans">
              {additionalValue}
            </Text>
          )}
        </Flex>
      </Box>
    </Flex>
  </Box>
);

export default DashboardWidgetTemplate; 