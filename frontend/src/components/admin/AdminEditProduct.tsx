import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Flex,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  Button,
  Grid,
  VStack,
  HStack,
  Switch,
  Text,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Divider,
  InputGroup,
  InputRightElement,
  Icon,
  Alert,
  AlertIcon,
  useToast,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Spinner,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Badge,
} from "@chakra-ui/react";
import {
  ChevronRightIcon,
  CalendarIcon,
  AttachmentIcon,
} from "@chakra-ui/icons";
import { useNavigate, useParams } from "react-router-dom";
import AdminActionButtons from "./AdminActionButtons";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import {
  productsAPI,
  categoriesAPI,
  brandsAPI,
  uploadAPI,
} from "../../utils/api";

interface ValidationErrors {
  productName: string;
  category: string;
  brand: string;
  image: string;
  description: string;
}

interface Category {
  _id: string;
  name:
    | string
    | {
        en?: string;
        ar?: string;
        fr?: string;
        de?: string;
        zh?: string;
        es?: string;
        ru?: string;
      }
    | any;
}

interface Brand {
  _id: string;
  name:
    | string
    | {
        en?: string;
        ar?: string;
        fr?: string;
        de?: string;
        zh?: string;
        es?: string;
        ru?: string;
      }
    | any;
}

interface MultilingualField {
  en?: string;
  ar?: string;
  fr?: string;
  de?: string;
  zh?: string;
  es?: string;
  ru?: string;
  ja?: string;
}

const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
];

const AdminEditProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();

  // Form data state
  const [formData, setFormData] = useState({
    // Basic Info
    productName: "",
    brand: "",
    category: "",
    description: "",

    // Meta Content
    metaTitle: "",
    metaDescription: "",

    // Technical Details
    chemicalName: "",
    certifications: "",
    casNo: "",
    hsCode: "",
    grade: "",
    commercialName: "",

    // Usage & Packaging
    usageApplications: "",
    storage: "",
    packagingType: "",
    packingType: "",
    safetyStandard: "",
    minimumQuantities: "",

    // Sale Settings
    saleStartDate: "",
    saleEndDate: "",
    salePercentage: "",

    // Sensitive Documents
    tds: "",
    msds: "",
    coa: "",
  });

  // Multilingual data state
  const [multilingualData, setMultilingualData] = useState<{
    name: MultilingualField;
    description: MultilingualField;
    metaTitle: MultilingualField;
    metaDescription: MultilingualField;
    chemicalName: MultilingualField;
    certifications: MultilingualField;
    grade: MultilingualField;
    commercialName: MultilingualField;
    usageApplications: MultilingualField;
    storage: MultilingualField;
    safetyStandard: MultilingualField;
  }>({
    name: {},
    description: {},
    metaTitle: {},
    metaDescription: {},
    chemicalName: {},
    certifications: {},
    grade: {},
    commercialName: {},
    usageApplications: {},
    storage: {},
    safetyStandard: {},
  });

  // File states
  const [productImage, setProductImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [tdsFile, setTdsFile] = useState<File | null>(null);
  const [msdsFile, setMsdsFile] = useState<File | null>(null);
  const [coaFile, setCoaFile] = useState<File | null>(null);

  // Options data
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  // Refs
  const productImageInputRef = useRef<HTMLInputElement>(null);
  const tdsInputRef = useRef<HTMLInputElement>(null);
  const msdsInputRef = useRef<HTMLInputElement>(null);
  const coaInputRef = useRef<HTMLInputElement>(null);

  // Component state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({
    productName: "",
    category: "",
    brand: "",
    image: "",
    description: "",
  });

  // Grade options
  const gradeOptions = [
    { value: "industrial", label: "Industrial" },
    { value: "food", label: "Food" },
    { value: "pharmaceutical", label: "Pharmaceutical" },
  ];

  // Change tracking state
  const [originalData, setOriginalData] = useState<any>(null);
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.error("Loading timeout - forcing loading to false");
        setLoading(false);
        setError("Loading timeout - please refresh the page");
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [loading]);

  const loadData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      console.log("Loading data for product ID:", id);

      // Load select options and product data in parallel
      const [categoriesResponse, brandsResponse, productResponse] =
        await Promise.all([
          categoriesAPI.getAll(),
          brandsAPI.getAll(),
          productsAPI.getByIdAdmin(id), // Get raw product data for admin editing
        ]);

      console.log("API responses:", {
        categoriesResponse,
        brandsResponse,
        productResponse,
      });

      setCategories(categoriesResponse.categories || categoriesResponse || []);
      setBrands(brandsResponse.brands || brandsResponse || []);

      // Now we get the raw product data with full multilingual structure
      const product = productResponse;

      // Helper function to extract English content from multilingual fields
      const getEnglishValue = (field: any) => {
        if (!field) return "";
        if (typeof field === "string") return field;
        if (typeof field === "object" && field.en) return field.en;
        return "";
      };

      // The raw product data is the single source of truth for original values.
      setOriginalData(product);

      // Set form data, keeping HTML for ReactQuill
      setFormData({
        productName: getEnglishValue(product.name),
        category: product.category?._id || product.category || "",
        brand: product.brand?._id || product.brand || "",
        description: getEnglishValue(product.description), // Keep HTML
        metaTitle: getEnglishValue(product.metaTitle),
        metaDescription: getEnglishValue(product.metaDescription),
        chemicalName: getEnglishValue(product.chemicalName),
        certifications: getEnglishValue(product.certifications),
        casNo: product.casNo || "",
        hsCode: product.hsCode || "",
        grade: getEnglishValue(product.grade),
        commercialName: getEnglishValue(product.commercialName),
        usageApplications: getEnglishValue(product.usageApplications),
        storage: getEnglishValue(product.storage),
        packagingType: product.packagingType || "",
        packingType: product.packingType || "",
        safetyStandard: getEnglishValue(product.safetyStandard),
        minimumQuantities: product.minimumQuantities?.toString() || "",
        saleStartDate: product.saleStartDate
          ? new Date(product.saleStartDate).toISOString().split("T")[0]
          : "",
        saleEndDate: product.saleEndDate
          ? new Date(product.saleEndDate).toISOString().split("T")[0]
          : "",
        salePercentage: product.salePercentage?.toString() || "",
        tds: product.tds || "",
        msds: product.msds || "",
        coa: product.coa || "",
      });

      // Set multilingual data, keeping HTML for ReactQuill
      setMultilingualData({
        name: product.name || {},
        description: product.description || {}, // Keep HTML
        metaTitle: product.metaTitle || {},
        metaDescription: product.metaDescription || {},
        chemicalName: product.chemicalName || {},
        certifications: product.certifications || {},
        grade: product.grade || {},
        commercialName: product.commercialName || {},
        usageApplications: product.usageApplications || {},
        storage: product.storage || {},
        safetyStandard: product.safetyStandard || {},
      });

      if (product.image) {
        setImagePreview(product.image);
      }

      // Mark initialization as complete
      setIsInitializing(false);
      console.log("Data loading completed successfully");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load product data";
      console.error("Load error:", err);
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Track changes in form data
  const trackFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (isInitializing) return;

    if (originalData) {
      const stripHtml = (html: string) => {
        if (!html) return "";
        const tmp = document.createElement("div");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
      };

      const getEnglishValue = (f: any) =>
        f?.en || (typeof f === "string" ? f : "");

      const modelField = field === "productName" ? "name" : field;
      let originalValue = originalData[modelField];

      // For multilingual fields, we need to get the english value from the object
      if (
        [
          "productName",
          "description",
          "metaTitle",
          "metaDescription",
          "chemicalName",
          "certifications",
          "grade",
          "commercialName",
          "usageApplications",
          "storage",
          "safetyStandard",
        ].includes(field)
      ) {
        originalValue = getEnglishValue(originalData[modelField]);
      }

      const isDesc = field === "description";
      const compareValue = isDesc ? stripHtml(value) : value;
      const compareOriginal = isDesc ? stripHtml(originalValue) : originalValue;

      if (compareOriginal !== compareValue) {
        setChangedFields((prev) => new Set(prev).add(field));
      } else {
        setChangedFields((prev) => {
          const newSet = new Set(prev);
          newSet.delete(field);
          return newSet;
        });
      }
    }

    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Track changes in multilingual data
  const trackMultilingualChange = (
    field: string,
    language: string,
    value: string
  ) => {
    setMultilingualData((prev) => ({
      ...prev,
      [field]: { ...prev[field as keyof typeof prev], [language]: value },
    }));

    if (isInitializing) return;

    if (originalData) {
      const stripHtml = (html: string) => {
        if (!html) return "";
        const tmp = document.createElement("div");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
      };

      const originalLangValue = originalData[field]?.[language] || "";

      const isDesc = field === "description";
      const compareValue = isDesc ? stripHtml(value) : value;
      const compareOriginal = isDesc
        ? stripHtml(originalLangValue)
        : originalLangValue;

      if (compareOriginal !== compareValue) {
        setChangedFields((prev) => new Set(prev).add(`${field}(${language})`));
      } else {
        setChangedFields((prev) => {
          const newSet = new Set(prev);
          newSet.delete(`${field}(${language})`);
          return newSet;
        });
      }
    }
  };

  // Track file changes
  const trackFileChange = (
    file: File | null,
    setter: (file: File | null) => void,
    fieldName: string
  ) => {
    if (file) {
      // Validate file type (PDF only)
      if (file.type !== "application/pdf") {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF file",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      setter(file);
      setChangedFields((prev) => new Set(prev).add(fieldName));
    }
  };

  // Track image change
  const trackImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProductImage(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Track change
      setChangedFields((prev) => new Set(prev).add("image"));

      // Clear validation error
      if (validationErrors.image) {
        setValidationErrors((prev) => ({ ...prev, image: "" }));
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    trackFormChange(field, value);
  };

  const handleMultilingualChange = (
    field: string,
    language: string,
    value: string
  ) => {
    trackMultilingualChange(field, language, value);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    trackImageChange(e);
  };

  const handleDocumentChange = (
    file: File | null,
    setter: (file: File | null) => void,
    fieldName: string
  ) => {
    trackFileChange(file, setter, fieldName);
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {
      productName: "",
      category: "",
      brand: "",
      image: "",
      description: "",
    };

    if (!formData.productName.trim()) {
      errors.productName = "Product name is required";
    }

    if (!formData.category) {
      errors.category = "Category is required";
    }

    if (!formData.brand) {
      errors.brand = "Brand is required";
    }

    if (!productImage && !imagePreview) {
      errors.image = "Product image is required";
    }

    if (!formData.description.trim()) {
      errors.description = "Product description is required";
    }

    setValidationErrors(errors);
    return Object.values(errors).every((error) => error === "");
  };

  const uploadDocument = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("myFile", file);

    const response = await fetch(
      "http://localhost:5002/api/cloudinary/upload",
      {
        method: "POST",
        credentials: "include",
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Upload failed");
    }

    const result = await response.json();
    return result.publicId; // Return the public ID for storage
  };

  // Build minimal update data based on tracked changes
  const buildUpdateData = () => {
    const updateData: any = {};

    // Handle non-multilingual field changes
    changedFields.forEach((field) => {
      if (field === "image") {
        // Image will be handled separately
        return;
      }

      if (field === "tds" || field === "msds" || field === "coa") {
        // Document fields will be handled separately
        return;
      }

      // Check if this is a multilingual field change (format: fieldName(language))
      const languageMatch = field.match(/^(.+)\((.+)\)$/);
      if (languageMatch) {
        const [, fieldName, language] = languageMatch;
        const value =
          multilingualData[fieldName as keyof typeof multilingualData]?.[
            language as keyof MultilingualField
          ];
        if (value !== undefined) {
          if (!updateData[fieldName]) {
            updateData[fieldName] = {};
          }
          updateData[fieldName][language] = value;
        }
        return;
      }

      // Handle regular non-multilingual field changes
      if (formData[field as keyof typeof formData] !== undefined) {
        const value = formData[field as keyof typeof formData];
        // Only add if value is not empty or if it's a required field
        if (
          value !== "" ||
          ["productName", "category", "brand", "description"].includes(field)
        ) {
          updateData[field] = value;
        }
      }
    });

    // Handle English field updates for multilingual fields from form data
    const multilingualFormFields = [
      "productName",
      "description",
      "metaTitle",
      "metaDescription",
      "chemicalName",
      "certifications",
      "grade",
      "commercialName",
      "usageApplications",
      "storage",
      "safetyStandard",
    ];

    multilingualFormFields.forEach((field) => {
      if (changedFields.has(field)) {
        const formValue = formData[field as keyof typeof formData];
        if (formValue !== undefined && formValue !== "") {
          // Map form field names to multilingual field names
          const multilingualFieldName =
            field === "productName" ? "name" : field;
          if (!updateData[multilingualFieldName]) {
            updateData[multilingualFieldName] = {};
          }
          updateData[multilingualFieldName].en = formValue;
        }
      }
    });

    return updateData;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Build minimal update data
      const updateData = buildUpdateData();

      // Handle image upload if changed
      if (changedFields.has("image") && productImage) {
        console.log("Uploading new product image...");
        const uploadResponse = await uploadAPI.uploadImage(productImage);
        updateData.image = uploadResponse.url;
        console.log("New product image uploaded:", updateData.image);
      }

      // Handle document uploads if changed
      if (changedFields.has("tds") && tdsFile) {
        console.log("Uploading new TDS document...");
        const tdsPublicId = await uploadDocument(tdsFile);
        updateData.tds = tdsPublicId;
        console.log("New TDS uploaded:", tdsPublicId);
      }

      if (changedFields.has("msds") && msdsFile) {
        console.log("Uploading new MSDS document...");
        const msdsPublicId = await uploadDocument(msdsFile);
        updateData.msds = msdsPublicId;
        console.log("New MSDS uploaded:", msdsPublicId);
      }

      if (changedFields.has("coa") && coaFile) {
        console.log("Uploading new COA document...");
        const coaPublicId = await uploadDocument(coaFile);
        updateData.coa = coaPublicId;
        console.log("New COA uploaded:", coaPublicId);
      }

      // Strip HTML tags from description if it changed
      if (changedFields.has("description")) {
        const stripHtml = (html: string) => {
          const tmp = document.createElement("div");
          tmp.innerHTML = html;
          return tmp.textContent || tmp.innerText || "";
        };

        const cleanDescription = stripHtml(formData.description);
        if (updateData.description) {
          updateData.description.en = cleanDescription.trim();
        }
      }

      console.log("Changed fields:", Array.from(changedFields));
      console.log("Sending minimal update data:", updateData);

      const response = await productsAPI.update(id!, updateData);
      console.log("Product updated successfully:", response);

      toast({
        title: "Success",
        description: "Product updated successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      navigate("/admin/products");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update product";
      console.error("Save error:", err);
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate("/admin/products");
  };

  const renderMultilingualField = (
    fieldName: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    isTextArea: boolean = false
  ) => {
    const multilingualField =
      multilingualData[fieldName as keyof typeof multilingualData];
    const hasError = validationErrors[fieldName as keyof ValidationErrors];

    return (
      <FormControl isInvalid={!!hasError}>
        <FormLabel color="gray.600">{label}</FormLabel>
        {isTextArea ? (
          <ReactQuill
            theme="snow"
            value={value}
            onChange={onChange}
            style={{
              minHeight: 120,
              border: `1px solid ${hasError ? "#E53E3E" : "#E2E8F0"}`,
              borderRadius: "8px",
              background: "white",
            }}
          />
        ) : (
          <Input
            placeholder={`Enter ${label.toLowerCase()}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            borderColor={hasError ? "red.300" : "gray.200"}
          />
        )}
        {hasError && (
          <Text fontSize="sm" color="red.500" mt={1}>
            {hasError}
          </Text>
        )}
        <Text fontSize="xs" color="#B40519" mt={1} cursor="pointer">
          🔗 Automatic translation
        </Text>

        {/* Multilingual Accordion */}
        <Accordion allowToggle mt={2}>
          <AccordionItem>
            <AccordionButton px={0} py={2}>
              <Box
                as="span"
                flex="1"
                textAlign="left"
                fontSize="sm"
                color="gray.600"
              >
                🌐 View/Edit All Languages (
                {Object.keys(multilingualField || {}).length}/8)
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={4} px={0}>
              <VStack spacing={3} align="stretch">
                {languages.map((lang) => (
                  <Box
                    key={lang.code}
                    p={3}
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="md"
                  >
                    <Flex align="center" mb={2}>
                      <Text fontSize="sm" fontWeight="medium" color="gray.700">
                        {lang.flag} {lang.name}
                      </Text>
                      {lang.code === "en" && (
                        <Badge colorScheme="blue" ml={2} fontSize="xs">
                          Primary
                        </Badge>
                      )}
                    </Flex>
                    {isTextArea ? (
                      <ReactQuill
                        theme="snow"
                        value={
                          multilingualField?.[
                            lang.code as keyof MultilingualField
                          ] || ""
                        }
                        onChange={(value) =>
                          handleMultilingualChange(fieldName, lang.code, value)
                        }
                        style={{
                          minHeight: 100,
                          border: "1px solid #E2E8F0",
                          borderRadius: "8px",
                          background: "white",
                        }}
                      />
                    ) : (
                      <Input
                        size="sm"
                        placeholder={`${label} in ${lang.name}`}
                        value={
                          multilingualField?.[
                            lang.code as keyof MultilingualField
                          ] || ""
                        }
                        onChange={(e) =>
                          handleMultilingualChange(
                            fieldName,
                            lang.code,
                            e.target.value
                          )
                        }
                      />
                    )}
                  </Box>
                ))}
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </FormControl>
    );
  };

  const renderDocumentField = (
    fieldName: string,
    label: string,
    existingPublicId: string | null,
    file: File | null,
    setFile: (file: File | null) => void,
    inputRef: React.RefObject<HTMLInputElement>
  ) => {
    const getDocumentUrl = (publicId: string) => {
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "dzuopkvey";
      return `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}.pdf`;
    };

    return (
      <FormControl>
        <FormLabel color="gray.600">{label}</FormLabel>

        {/* Existing Document Display */}
        {existingPublicId && (
          <Box
            mb={3}
            p={3}
            border="1px solid"
            borderColor="green.200"
            borderRadius="md"
            bg="green.50"
          >
            <Flex align="center" justify="space-between">
              <Flex align="center">
                <Text fontSize="sm" color="green.700" fontWeight="medium">
                  📄 Existing Document Available
                </Text>
              </Flex>
              <Button
                size="sm"
                colorScheme="green"
                variant="outline"
                onClick={() =>
                  window.open(getDocumentUrl(existingPublicId), "_blank")
                }
              >
                View PDF
              </Button>
            </Flex>
            <Text fontSize="xs" color="green.600" mt={1}>
              Public ID: {existingPublicId}
            </Text>
          </Box>
        )}

        {/* File Upload */}
        <Input
          type="file"
          accept=".pdf"
          ref={inputRef}
          display="none"
          onChange={(e) =>
            handleDocumentChange(
              e.target.files?.[0] || null,
              setFile,
              fieldName
            )
          }
        />
        <Box flex="1" position="relative">
          <Flex
            align="center"
            h="40px"
            borderRadius="lg"
            border="2px solid #E2E8E0"
            pl={3}
            pr={0}
            py={3}
          >
            <Text
              fontFamily="IBM Plex Sans"
              fontSize="18px"
              color="#8D8D8D"
              flex="1"
            >
              {file
                ? file.name
                : existingPublicId
                ? "Replace existing document"
                : "upload document"}
            </Text>
            <Box
              bg="#EAEAEA"
              h="40px"
              w="120px"
              borderTopRightRadius="8px"
              borderBottomRightRadius="8px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              onClick={() => inputRef.current?.click()}
            >
              <Text
                fontFamily="IBM Plex Sans"
                fontSize="16px"
                color="#424242"
                fontWeight={500}
              >
                Choose File
              </Text>
            </Box>
          </Flex>
        </Box>
        <Text fontSize="xs" color="gray.400" mt={1}>
          PDF files only, max 10MB
        </Text>
      </FormControl>
    );
  };

  if (loading) {
    return (
      <Box p={6} display="flex" justifyContent="center" alignItems="center" minH="400px">
        <Spinner size="xl" color="blue.500" />
      </Box>
    );
  }

  return (
    <Box p={6}>
      {/* Breadcrumb */}
      <Breadcrumb
        spacing="8px"
        separator={<ChevronRightIcon color="gray.500" />}
        mb={6}
      >
        <BreadcrumbItem>
          <BreadcrumbLink href="/admin/products" color="gray.600">
            Products
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink href="#" fontWeight="bold">
            Edit Product
          </BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      {error && (
        <Alert status="error" mb={6}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      {/* Main Form */}
      <Box bg="white" borderRadius="lg" p={6} boxShadow="sm">
        <VStack spacing={8} align="stretch">
          {/* Basic Info Section */}
          <Box>
            <Heading size="md" color="gray.700" mb={4}>
              Basic Info
            </Heading>
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
              {renderMultilingualField(
                "name",
                "Product Name *",
                formData.productName,
                (value) => handleInputChange("productName", value)
              )}

              <FormControl isInvalid={!!validationErrors.brand}>
                <FormLabel color="gray.600">Brand *</FormLabel>
                <Select
                  placeholder="Select brand"
                  value={formData.brand}
                  onChange={(e) => handleInputChange("brand", e.target.value)}
                  borderColor={
                    validationErrors.brand ? "red.300" : "gray.200"
                  }
                  isDisabled={loading}
                >
                  {brands.map((brand) => (
                    <option key={brand._id} value={brand._id}>
                      {typeof brand.name === "string"
                        ? brand.name
                        : brand.name?.en || brand.name || "Unknown Brand"}
                    </option>
                  ))}
                </Select>
                {validationErrors.brand && (
                  <Text fontSize="sm" color="red.500" mt={1}>
                    {validationErrors.brand}
                  </Text>
                )}
              </FormControl>

              <FormControl isInvalid={!!validationErrors.category}>
                <FormLabel color="gray.600">Category/Industry *</FormLabel>
                <Select
                  placeholder="Select category"
                  value={formData.category}
                  onChange={(e) =>
                    handleInputChange("category", e.target.value)
                  }
                  borderColor={
                    validationErrors.category ? "red.300" : "gray.200"
                  }
                  isDisabled={loading}
                >
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {typeof category.name === "string"
                        ? category.name
                        : category.name?.en ||
                          category.name ||
                          "Unknown Category"}
                    </option>
                  ))}
                </Select>
                {validationErrors.category && (
                  <Text fontSize="sm" color="red.500" mt={1}>
                    {validationErrors.category}
                  </Text>
                )}
              </FormControl>

              <FormControl>
                <FormLabel color="gray.600">Product Image</FormLabel>
                <Input
                  type="file"
                  accept="image/*"
                  ref={productImageInputRef}
                  display="none"
                  onChange={handleImageChange}
                />
                <Box flex="1" position="relative">
                  <Flex
                    align="center"
                    h="40px"
                    borderRadius="lg"
                    border="2px solid #E2E8E0"
                    pl={3}
                    pr={0}
                    py={3}
                  >
                    <Text
                      fontFamily="IBM Plex Sans"
                      fontSize="18px"
                      color="#8D8D8D"
                      flex="1"
                    >
                      {productImage
                        ? productImage.name
                        : imagePreview
                        ? "Current image"
                        : "upload product image"}
                    </Text>
                    <Box
                      bg="#EAEAEA"
                      h="40px"
                      w="120px"
                      borderTopRightRadius="8px"
                      borderBottomRightRadius="8px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      cursor="pointer"
                      onClick={() => productImageInputRef.current?.click()}
                    >
                      <Text
                        fontFamily="IBM Plex Sans"
                        fontSize="16px"
                        color="#424242"
                        fontWeight={500}
                      >
                        Choose File
                      </Text>
                    </Box>
                  </Flex>
                </Box>
                {imagePreview && (
                  <Box mt={2}>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{ maxHeight: "120px", borderRadius: "8px" }}
                    />
                  </Box>
                )}
                <Text fontSize="xs" color="gray.400" mt={1}>
                  Recommended size: 400x400px
                </Text>
              </FormControl>
            </Grid>

            {/* Description */}
            {renderMultilingualField(
              "description",
              "Description *",
              formData.description,
              (value) => handleInputChange("description", value),
              true
            )}
          </Box>

          <Divider />

          {/* Meta Content Section */}
          <Box>
            <Heading size="md" color="gray.700" mb={4}>
              Meta Content
            </Heading>
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
              {renderMultilingualField(
                "metaTitle",
                "Meta Title",
                formData.metaTitle,
                (value) => handleInputChange("metaTitle", value)
              )}
              {renderMultilingualField(
                "metaDescription",
                "Meta Description",
                formData.metaDescription,
                (value) => handleInputChange("metaDescription", value)
              )}
            </Grid>
          </Box>

          <Divider />

          {/* Technical Details Section */}
          <Box>
            <Heading size="md" color="gray.700" mb={4}>
              Technical Details
            </Heading>
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
              {renderMultilingualField(
                "chemicalName",
                "Chemical Name",
                formData.chemicalName,
                (value) => handleInputChange("chemicalName", value)
              )}
              {renderMultilingualField(
                "certifications",
                "Certifications",
                formData.certifications,
                (value) => handleInputChange("certifications", value)
              )}

              <FormControl>
                <FormLabel color="gray.600">CAS Number</FormLabel>
                <Input
                  placeholder="Enter CAS number"
                  value={formData.casNo}
                  onChange={(e) => handleInputChange("casNo", e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel color="gray.600">HS Code</FormLabel>
                <Input
                  placeholder="Enter HS code"
                  value={formData.hsCode}
                  onChange={(e) => handleInputChange("hsCode", e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel color="gray.600">Grade</FormLabel>
                <Select
                  placeholder="Select grade"
                  value={formData.grade}
                  onChange={(e) => handleInputChange("grade", e.target.value)}
                >
                  {gradeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Text fontSize="xs" color="#B40519" mt={1} cursor="pointer">
                  🔗 Automatic translation
                </Text>
              </FormControl>

              {renderMultilingualField(
                "commercialName",
                "Commercial Name",
                formData.commercialName,
                (value) => handleInputChange("commercialName", value)
              )}
            </Grid>
          </Box>

          <Divider />

          {/* Usage & Packaging Section */}
          <Box>
            <Heading size="md" color="gray.700" mb={4}>
              Usage & Packaging
            </Heading>
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
              {renderMultilingualField(
                "usageApplications",
                "Usage Applications",
                formData.usageApplications,
                (value) => handleInputChange("usageApplications", value)
              )}
              {renderMultilingualField(
                "storage",
                "Storage",
                formData.storage,
                (value) => handleInputChange("storage", value)
              )}

              <FormControl>
                <FormLabel color="gray.600">Packaging Type</FormLabel>
                <Input
                  placeholder="Enter packaging type"
                  value={formData.packagingType}
                  onChange={(e) =>
                    handleInputChange("packagingType", e.target.value)
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel color="gray.600">Packing Type</FormLabel>
                <Input
                  placeholder="Enter packing type"
                  value={formData.packingType}
                  onChange={(e) =>
                    handleInputChange("packingType", e.target.value)
                  }
                />
              </FormControl>

              {renderMultilingualField(
                "safetyStandard",
                "Safety Standard",
                formData.safetyStandard,
                (value) => handleInputChange("safetyStandard", value)
              )}

              <FormControl>
                <FormLabel color="gray.600">Minimum Quantities</FormLabel>
                <NumberInput
                  value={formData.minimumQuantities}
                  onChange={(value) =>
                    handleInputChange("minimumQuantities", value)
                  }
                  min={0}
                >
                  <NumberInputField placeholder="Enter minimum quantities" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>
            </Grid>
          </Box>

          <Divider />

          {/* Sale Settings Section */}
          <Box>
            <Heading size="md" color="gray.700" mb={4}>
              Sale Settings
            </Heading>
            <Grid
              templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }}
              gap={6}
            >
              <FormControl>
                <FormLabel color="gray.600">Sale Start Date</FormLabel>
                <Input
                  type="date"
                  value={formData.saleStartDate}
                  onChange={(e) =>
                    handleInputChange("saleStartDate", e.target.value)
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel color="gray.600">Sale End Date</FormLabel>
                <Input
                  type="date"
                  value={formData.saleEndDate}
                  onChange={(e) =>
                    handleInputChange("saleEndDate", e.target.value)
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel color="gray.600">Sale Percentage</FormLabel>
                <NumberInput
                  value={formData.salePercentage}
                  onChange={(value) =>
                    handleInputChange("salePercentage", value)
                  }
                  min={0}
                  max={100}
                >
                  <NumberInputField placeholder="Enter sale percentage" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>
            </Grid>
          </Box>

          <Divider />

          {/* Sensitive Documents Section */}
          <Box>
            <Heading size="md" color="gray.700" mb={4}>
              Sensitive Documents
            </Heading>
            <Grid
              templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }}
              gap={6}
            >
              {renderDocumentField(
                "tds",
                "TDS (Technical Data Sheet)",
                formData.tds,
                tdsFile,
                setTdsFile,
                tdsInputRef
              )}
              {renderDocumentField(
                "msds",
                "MSDS (Material Safety Data Sheet)",
                formData.msds,
                msdsFile,
                setMsdsFile,
                msdsInputRef
              )}
              {renderDocumentField(
                "coa",
                "COA (Certificate of Analysis)",
                formData.coa,
                coaFile,
                setCoaFile,
                coaInputRef
              )}
            </Grid>
          </Box>

          {/* Action Buttons */}
          <AdminActionButtons
            onSave={handleSave}
            onCancel={handleCancel}
            isLoading={saving}
            saveLabel="Update Product"
          />
        </VStack>
      </Box>
    </Box>
  );
};

export default AdminEditProduct;
