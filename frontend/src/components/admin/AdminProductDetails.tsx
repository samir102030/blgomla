import React, { useEffect } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Image,
  Badge,
  Grid,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Spinner,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { ChevronRightIcon } from "@chakra-ui/icons";
import { useParams } from "react-router-dom";
import { useProductStore } from "../../stores/product.store";
import useBrandStore from "../../stores/brand.store";

const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) => (
  <Grid
    templateColumns="200px 1fr"
    py={2}
    borderBottom="1px solid"
    borderColor="gray.100"
  >
    <Text fontWeight="medium" color="gray.700">
      {label}
    </Text>
    <Text color="gray.600">{value || "-"}</Text>
  </Grid>
);

const AdminProductDetails = () => {
  const { id } = useParams<{ id: string }>();
  const {
    product,
    loading,
    error,
    getProductById,
    categories,
    getAllCategories,
  } = useProductStore();
  const { brands, getAllBrands } = useBrandStore();

  useEffect(() => {
    if (id) getProductById(id);
    if (categories.length === 0) getAllCategories();
    if (brands.length === 0) getAllBrands();
  }, [id]);

  const getBrandName = () => {
    if (!product?.brand) return "-";
    if (typeof product.brand === "object") return product.brand.name;
    const found = brands.find((b) => b._id === product.brand);
    return found ? found.name : product.brand;
  };

  const getCategoryName = () => {
    if (!product?.category) return "-";
    if (typeof product.category === "object") return product.category.name;
    const found = categories.find((c) => c._id === product.category);
    return found ? found.name : product.category;
  };

  const getEn = (field: any) => {
    if (!field) return "-";
    if (typeof field === "string") return field;
    if (typeof field === "object" && field.en) return field.en;
    return Object.values(field)[0] || "-";
  };

  if (loading) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="gray.100">
        <Spinner size="xl" color="red.500" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="gray.100">
        <Alert status="error" maxW="lg">
          <AlertIcon />
          {error}
        </Alert>
      </Flex>
    );
  }

  if (!product) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="gray.100">
        <Text fontSize="xl">Product not found</Text>
      </Flex>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50" p={{ base: 2, md: 8 }}>
      <Box maxW="1100px" mx="auto">
        <Box bg="white" px={4} py={3} borderRadius="md" boxShadow="sm" mb={6}>
          <Breadcrumb
            spacing="8px"
            separator={<ChevronRightIcon color="gray.400" />}
          >
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin/products" color="gray.600">
                Products
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink href="#" fontWeight="bold">
                Product details
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>
        </Box>

        {/* Main Product Card */}
        <Box
          bg="white"
          borderRadius="md"
          boxShadow="md"
          p={{ base: 4, md: 8 }}
          mb={8}
          display={{ base: "block", md: "flex" }}
          alignItems="center"
          gap={8}
        >
          <Box flexShrink={0} display="flex" alignItems="center" justifyContent="center" mb={{ base: 6, md: 0 }}>
            <Image
              src={product.image}
              alt={getEn(product.name)}
              borderRadius="md"
              objectFit="contain"
              maxH="260px"
              maxW="200px"
              bg="gray.50"
              p={2}
              boxShadow="sm"
              border="1px solid"
              borderColor="gray.100"
            />
          </Box>
          <Box flex={1} minW={0}>
            <Heading size="lg" color="gray.700" mb={2} fontWeight="bold" isTruncated>
              {getEn(product.name)}
            </Heading>
            {product.onSale && (
              <Badge
                colorScheme="green"
                mb={2}
                px={3}
                py={1}
                borderRadius="full"
                fontSize="md"
                fontWeight="semibold"
              >
                On sale
              </Badge>
            )}
            <Text fontSize="md" color="gray.700" mb={1}>
              <Text as="span" fontWeight="semibold">Brand:</Text> {getBrandName()}
            </Text>
            <Text fontSize="md" color="gray.700" mb={3}>
              <Text as="span" fontWeight="semibold">Category:</Text> {getCategoryName()}
            </Text>
            <Heading size="sm" color="gray.700" mb={1} mt={2}>
              Description
            </Heading>
            <Text fontSize="md" color="gray.600">
              {getEn(product.description)}
            </Text>
          </Box>
        </Box>

        {/* Details Section */}
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
          <Box bg="white" borderRadius="md" boxShadow="md" p={{ base: 4, md: 6 }}>
            <Heading size="md" color="gray.700" mb={4} fontWeight="semibold">
              Technical Details
            </Heading>
            <Box borderRadius="md" overflow="hidden" border="1px solid" borderColor="gray.100">
              <DetailRow label="Chemicals Name" value={getEn(product.chemicalName)} />
              <DetailRow label="HS code" value={product.hsCode} />
              <DetailRow label="CAS No" value={product.casNo} />
              <DetailRow label="Certifications" value={getEn(product.certifications)} />
              <DetailRow label="Grade" value={getEn(product.grade)} />
              <DetailRow label="Commercial Name" value={getEn(product.commercialName)} />
            </Box>
          </Box>

          <Box bg="white" borderRadius="md" boxShadow="md" p={{ base: 4, md: 6 }}>
            <Heading size="md" color="gray.700" mb={4} fontWeight="semibold">
              Usage & Packaging
            </Heading>
            <Box borderRadius="md" overflow="hidden" border="1px solid" borderColor="gray.100">
              <DetailRow label="Usage Applications" value={getEn(product.usageApplications)} />
              <DetailRow label="Packaging type" value={product.packagingType} />
              <DetailRow label="Packing type" value={product.packingType} />
              <DetailRow label="Storage Info" value={getEn(product.storage)} />
              <DetailRow label="Safety Standard" value={getEn(product.safetyStandard)} />
              <DetailRow label="Minimum Quantities" value={product.minimumQuantities?.toString()} />
            </Box>
          </Box>
        </Grid>
      </Box>
    </Box>
  );
};

export default AdminProductDetails;
