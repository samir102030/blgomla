import { Box, Text, VStack, HStack, Icon, Button, useToast, Spinner, Link } from "@chakra-ui/react";
import { CheckIcon, DownloadIcon } from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useUserStore } from "../../stores/user.store";
import { usersAPI } from "../../utils/api";
import { axiosInstance } from "../../lib/axios";

interface SensitiveDocument {
  filename: string;
  url: string;
}

interface SensitiveDocumentsResponse {
  success: boolean;
  documents: {
    tds?: SensitiveDocument;
    msds?: SensitiveDocument;
    coa?: SensitiveDocument;
  };
}

interface ProductDocumentsProps {
  productId: string;
}

const ProductDocuments = ({ productId }: ProductDocumentsProps) => {
  const navigate = useNavigate();
  const toast = useToast();
  const user = useUserStore(state => state.user);
  const { getProfile } = useUserStore();
  const isLoggedIn = !!user;
  const [isRequesting, setIsRequesting] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<SensitiveDocumentsResponse["documents"] | null>(null);

  const isApproved = user?.approvalStatus === "approved" || user?.isApproved;

  useEffect(() => {
    if (isApproved && productId) {
      setLoadingDocs(true);
      setError(null);
      axiosInstance
        .get(`/products/${productId}/sensitive-documents`)
        .then(res => {
          setDocuments(res.data.documents);
        })
        .catch(err => {
          setError(
            err?.response?.data?.message || "Failed to load documents."
          );
        })
        .finally(() => setLoadingDocs(false));
    }
  }, [isApproved, productId]);

  const handleRequestApproval = async () => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    if (user?.approvalStatus === "pending") {
      toast({
        title: "Already Requested",
        description:
          "You have already requested approval. Please wait for admin approval.",
        status: "info",
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    if (isApproved) {
      toast({
        title: "Already Approved",
        description: "Your account is already approved.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    try {
      setIsRequesting(true);
      await usersAPI.requestApproval();
      await getProfile();
      toast({
        title: "Request Submitted",
        description:
          "Your approval request has been submitted successfully. Please wait for admin approval.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit approval request",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <Box bg="gray.50" p={6} borderRadius="lg">
      {!isLoggedIn && (
        <Text fontSize="xl" fontWeight="bold" mb={4}>
          Register for the more
        </Text>
      )}
      {isApproved ? (
        loadingDocs ? (
          <Spinner size="lg" />
        ) : error ? (
          <Text color="red.500">{error}</Text>
        ) : (
          <VStack align="stretch" spacing={3}>
            {documents && Object.entries(documents).map(([key, doc]) =>
              doc ? (
                <HStack key={key}>
                  <Icon as={CheckIcon} color="red.500" />
                  <Text flex={1}>{
                    key === "tds"
                      ? "Technical Data Sheet"
                      : key === "msds"
                      ? "Material Safety Data Sheet"
                      : key === "coa"
                      ? "Certificate Of Analysis"
                      : key.toUpperCase()
                  }</Text>
                  <Link href={doc.url} isExternal download style={{ textDecoration: 'none' }}>
                    <Button
                      leftIcon={<DownloadIcon />}
                      colorScheme="blue"
                      variant="outline"
                      size="sm"
                      _hover={{ bg: 'blue.50', color: 'blue.700', borderColor: 'blue.400' }}
                      as="span"
                    >
                      Download
                    </Button>
                  </Link>
                </HStack>
              ) : null
            )}
            {(!documents || Object.keys(documents).length === 0) && (
              <Text>No documents available.</Text>
            )}
          </VStack>
        )
      ) : (
        <>
          <VStack align="stretch" spacing={3}>
            <HStack>
              <Icon as={CheckIcon} color="red.500" />
              <Text flex={1}>Technical Data Sheet</Text>
              <Text color="gray.500">TDS</Text>
            </HStack>
            <HStack>
              <Icon as={CheckIcon} color="red.500" />
              <Text flex={1}>Material Safety Data Sheet</Text>
              <Text color="gray.500">MSDS</Text>
            </HStack>
            <HStack>
              <Icon as={CheckIcon} color="red.500" />
              <Text flex={1}>Certificate Of Analysis</Text>
              <Text color="gray.500">COA</Text>
            </HStack>
          </VStack>
          <Button
            mt={6}
            bg="#B40519"
            color="white"
            borderRadius="lg"
            fontFamily="IBM Plex Sans"
            fontWeight={500}
            fontSize="18px"
            h="48px"
            w="full"
            _hover={{ bg: "#9A0416" }}
            _active={{ bg: "#7A0312" }}
            isLoading={isRequesting}
            loadingText="Requesting..."
            onClick={handleRequestApproval}
            isDisabled={user?.approvalStatus === "pending"}
          >
            {!isLoggedIn
              ? "Login to Request Access"
              : user?.approvalStatus === "pending"
              ? "Approval Pending"
              : "Request Access to Documents"}
          </Button>
        </>
      )}
    </Box>
  );
};

export default ProductDocuments;