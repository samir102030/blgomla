import { Box, SimpleGrid } from '@chakra-ui/react';
import DashboardWidgetTemplate from './DashboardWidgetTemplate';

// Example SVG Icons (you can replace these with any icons from heroicons.com, lucide.dev, etc.)

const BarChartIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="7" y="18" width="3" height="7" rx="1.5" fill="#fff"/>
    <rect x="14" y="12" width="3" height="13" rx="1.5" fill="#fff"/>
    <rect x="21" y="8" width="3" height="17" rx="1.5" fill="#fff"/>
  </svg>
);

const CheckmarkIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M20 6L9 17L4 12" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ClockIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2"/>
    <polyline points="12,6 12,12 16,14" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const XIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <line x1="18" y1="6" x2="6" y2="18" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="6" y1="6" x2="18" y2="18" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UserIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="7" r="4" stroke="#fff" strokeWidth="2"/>
  </svg>
);

const TrendingUpIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const WidgetExamples = () => (
  <Box p={8}>
    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
      
      {/* Total Sales - Black/Dark Theme */}
      <DashboardWidgetTemplate
        title="Total Sales"
        value="658.40"
        additionalValue="+658.40"
        icon={BarChartIcon}
        circleColor="#222"
      />

      {/* Completed Orders - Green Theme */}
      <DashboardWidgetTemplate
        title="Completed Orders"
        value="658.40"
        additionalValue="+658.40"
        icon={CheckmarkIcon}
        circleColor="#1AAC35"
      />

      {/* Pending Orders - Yellow Theme */}
      <DashboardWidgetTemplate
        title="Pending Orders"
        value="658.40"
        additionalValue="+658.40"
        icon={ClockIcon}
        circleColor="#C69B10"
      />

      {/* Canceled Orders - Red Theme */}
      <DashboardWidgetTemplate
        title="Canceled Orders"
        value="658.40"
        additionalValue="+658.40"
        icon={XIcon}
        circleColor="#900414"
      />

      {/* Approved Customer - Green with Light Background */}
      <DashboardWidgetTemplate
        title="Approved Customer"
        value="658.40"
        icon={UserIcon}
        circleColor="#1AAC35"
        backgroundColor="#E8F5E8"
        valueColor="#1AAC35"
      />

      {/* Not Approved Customer - Red with Light Background */}
      <DashboardWidgetTemplate
        title="Not Approved Customer"
        value="658.40"
        icon={UserIcon}
        circleColor="#900414"
        backgroundColor="#F8E8E8"
        valueColor="#900414"
      />

      {/* Example with Trending Up Icon - Blue Theme */}
      <DashboardWidgetTemplate
        title="Growth Rate"
        value="24.5%"
        additionalValue="+5.2%"
        icon={TrendingUpIcon}
        circleColor="#3B82F6"
        valueColor="#3B82F6"
        additionalValueColor="#3B82F6"
      />

    </SimpleGrid>
  </Box>
);

export default WidgetExamples; 