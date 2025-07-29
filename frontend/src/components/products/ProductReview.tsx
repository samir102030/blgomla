import { Box, Flex, Text, Image, IconButton } from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { Review } from "../../data/dummyData";

interface ProductReviewProps {
  review: Review;
  onPrevious: () => void;
  onNext: () => void;
}

const ProductReview = ({ review, onPrevious, onNext }: ProductReviewProps) => {
  return (
    <Box>
      <Box
        bg="white"
        borderRadius="2xl"
        borderBottomRightRadius={0}
        p={8}
        boxShadow="sm"
        mb={6}
      >
        <Flex gap={6} align="flex-start">
          <Box flexShrink={0}>
            <Image
              src={review.avatar}
              alt={review.userName}
              borderRadius="full"
              boxSize="80px"
              objectFit="cover"
            />
          </Box>
          <Box flex={1}>
            <Flex justify="space-between" align="flex-start" mb={4}>
              <Box>
                <Text fontSize="xl" fontWeight="semibold">
                  {review.userName}
                </Text>
                <Text color="gray.600">
                  {review.position} at {review.company}
                </Text>
              </Box>
              <Box color="red.600" fontSize="4xl">
                "
              </Box>
            </Flex>
            <Text fontSize="lg">{review.content}</Text>
          </Box>
        </Flex>
      </Box>

      <Flex justify="flex-end" gap={4}>
        <IconButton
          aria-label="Previous review"
          icon={<ChevronLeftIcon />}
          onClick={onPrevious}
          variant="outline"
          borderRadius="full"
          borderColor="red.500"
          color="red.500"
          size="lg"
        />
        <IconButton
          aria-label="Next review"
          icon={<ChevronRightIcon />}
          onClick={onNext}
          variant="outline"
          borderRadius="full"
          borderColor="red.500"
          color="red.500"
          size="lg"
        />
      </Flex>
    </Box>
  );
};

export default ProductReview;