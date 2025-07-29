import { Box, Text, VStack, HStack, Icon, Button, Image } from "@chakra-ui/react";
import { LocationIcon, VerifiedIcon, GlobalIcon } from "../icons/CustomIcons";
import { Supplier } from "../../data/dummyData";
import { brand } from "../../stores/product.store";
import { useNavigate } from "react-router-dom";


interface SupplierInfoProps {
  supplier: brand;
}

const SupplierInfo = ({ supplier }: SupplierInfoProps) => {
  const navigate = useNavigate();
  return (
    <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
      <HStack mb={4}>
        <Image
        src={supplier.logo}
        alt={supplier.name || "Brand Logo"}
        width="100px"
        height="auto"
        mb={4}
      />
        <Box>
          <Text fontWeight="bold">{supplier.name}</Text>
          {/* <Text color="gray.600">information</Text> */}
        </Box>
      </HStack>

      <VStack align="stretch" spacing={4}>
        {/* <HStack>
          <Icon as={LocationIcon} color="gray.500" boxSize={5} />
          <Text>Egypt, Cairo</Text>
        </HStack> */}
        {/* {supplier.isVerified && (
          <HStack>
            <Icon as={VerifiedIcon} color="green.500" boxSize={5} />
            <Text>Verified Seller</Text>
          </HStack>
        )} */}
        {/* {supplier.hasWorldwideShipping && (
          <HStack>
            <Icon as={GlobalIcon} color="gray.500" boxSize={5} />
            <Text>Worldwide shipping</Text>
          </HStack>
        )} */}

        <Button colorScheme="red" size="lg" onClick={() =>{ navigate("/contact"); window.scroll({top:0, behavior:"smooth"})}}>
          Send inquiry
        </Button>
        {/* <Button variant="outline" colorScheme="gray">
          Seller's profile
        </Button> */}
      </VStack>
    </Box>
  );
};

export default SupplierInfo;