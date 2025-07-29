import { Grid, Text } from '@chakra-ui/react'

interface ProductSpecificationProps {
  label: string;
  value: string;
}

const ProductSpecification = ({ label, value }: ProductSpecificationProps) => {
  // Convert camelCase to Title Case
  const formatLabel = (str: string) => {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
  };

  return (
    <Grid templateColumns="1fr 2fr" gap={2} py={2}>
      <Text color="gray.600">{formatLabel(label)}:</Text>
      <Text fontWeight="medium">{value}</Text>
    </Grid>
  );
};

export default ProductSpecification;