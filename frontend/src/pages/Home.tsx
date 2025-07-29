import { Box, Text, VStack } from "@chakra-ui/react";
import HeroSlider from "../components/home/HeroSlider";
import Marketplace from "../components/marketplace/Marketplace";
import CustomerPreviews from "../components/home/CustomerPreviews";
import CommitmentSection from "../components/home/CommitmentSection";
import NewsEventsSlider from "../components/home/NewsEventsSlider";
import ContactUs from "../components/home/ContactUs";
import RequestSampleOld from "./RequestSample.old";
import { useLanguageDirection } from "../hooks/useLanguageDirection";
import SocialMediaIcons from "../components/home/SocialMediaButtons";

const Home = () => {
  const { dir } = useLanguageDirection();

  return (
    <Box dir={dir}>
      <HeroSlider />
      <Marketplace />
      <CustomerPreviews />
      <CommitmentSection />
      <NewsEventsSlider />
      {/* <ContactUs /> */}
      <RequestSampleOld />
      <VStack mt={12} mb={4} spacing={2}>
        <SocialMediaIcons iconSize={50} icons={[]} />
      </VStack>
    </Box>
  );
};

export default Home;
