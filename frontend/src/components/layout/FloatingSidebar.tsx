import {
  Box,
  VStack,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  IconButton,
  Text,
  HStack,
  useTheme,
  Button,
  Flex,
  Input,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
  Avatar,
} from "@chakra-ui/react";
import {
  QuestionIcon,
  DownloadIcon,
  SearchIcon,
  ChatIcon,
} from "@chakra-ui/icons";
import { motion } from "framer-motion";
import { useNavigate } from 'react-router-dom';
import { useState } from "react";

const MotionIconButton = motion(IconButton);

const FloatingSidebar = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const brandColor = theme.colors.brand.primary;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [messages, setMessages] = useState<Array<{text: string, isUser: boolean}>>([
    { text: "Hello! How can I help you today?", isUser: false }
  ]);
  const [inputValue, setInputValue] = useState("");

  const quickQuestions = [
    "What medical industries do you serve?",
    "What pharmaceutical products are available?",
    "How can I request a medical sample?",
    "How to contact the medical team?"
  ];

  const handleSendMessage = (text: string) => {
    // Add user message
    setMessages(prev => [...prev, { text, isUser: true }]);
    setInputValue("");
    
    // Simulate bot response
    setTimeout(() => {
      let response = "";
      
      if (text.toLowerCase().includes("industries") || text.toLowerCase().includes("serve")) {
        response = "We serve various medical and pharmaceutical industries including hospitals, clinics, research labs, and medical manufacturing facilities.";
      } else if (text.toLowerCase().includes("products") || text.toLowerCase().includes("available")) {
        response = "We offer a wide range of medical and pharmaceutical chemicals, reagents, and supplies. You can browse our catalog on the Products page.";
      } else if (text.toLowerCase().includes("sample") || text.toLowerCase().includes("request")) {
        response = "You can request a sample of our medical-grade chemicals by filling out the form on our Request Sample page or contacting our medical sales team directly.";
      } else if (text.toLowerCase().includes("contact")) {
        response = "You can contact our medical division via email at medical@egychenhub.com or call us at +20 111 271 5666.";
      } else {
        response = "Thank you for your inquiry about our medical products. Our healthcare team will get back to you shortly.";
      }
      
      setMessages(prev => [...prev, { text: response, isUser: false }]);
    }, 1000);
  };

  const buttonStyles = {
    bg: `${brandColor}CC`, // CC adds 80% opacity
    color: "white",
    borderRadius: "20px 0 0 20px", // Rounded on left side only
    size: "lg",
    _hover: { bg: `${brandColor}E6` }, // E6 adds 90% opacity
  };

  const popoverContentStyles = {
    bg: "transparent",
    border: "none",
    w: "auto",
    _focus: { boxShadow: "none" },
    mr: 2,
    p: 0,
  };

  const hoverMenuStyles = {
    bg: `${brandColor}CC`,
    borderRadius: "full",
    px: 4,
    py: 2,
    cursor: "pointer",
    _hover: { bg: `${brandColor}E6` },
    spacing: 2,
  };

  return (
    <>
      <Box
        position="fixed"
        right={0}
        top="calc(40px + 300px)"
        zIndex={1000}
      >
        <VStack spacing={4} pr={4} align="end" p={0}>
          <Popover trigger="hover" placement="left" gutter={0}>
            <PopoverTrigger>
              <MotionIconButton
                aria-label="Support"
                icon={<QuestionIcon />}
                onClick={() => navigate('/products')}
                {...buttonStyles}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              />
            </PopoverTrigger>
            <PopoverContent {...popoverContentStyles}>
              <PopoverBody p={0}>
                <VStack spacing={2} align="end">
                  <HStack 
                  {...hoverMenuStyles}
                  onClick={() => navigate('/products')}
                  >
                    <SearchIcon color="white" boxSize={5} />
                    <Text color="white" fontSize="sm">
                      Search for a product
                    </Text>
                  </HStack>
                </VStack>
              </PopoverBody>
            </PopoverContent>
          </Popover>

          <Popover trigger="hover" placement="left" gutter={0}>
            <PopoverTrigger>
              <MotionIconButton
                aria-label="Download"
                icon={<DownloadIcon />}
                onClick={() => navigate('/request-sample')}
                {...buttonStyles}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              />
            </PopoverTrigger>
            <PopoverContent {...popoverContentStyles}>
              <PopoverBody p={0}>
                <VStack spacing={2} align="end">
                  <HStack {...hoverMenuStyles}
                  onClick={() => navigate('/request-sample')}
                  >
                    <DownloadIcon color="white" boxSize={5} />
                    <Text color="white" fontSize="sm">
                      Get Quote
                    </Text>
                  </HStack>
                </VStack>
              </PopoverBody>
            </PopoverContent>
          </Popover>

          <Popover trigger="hover" placement="left" gutter={0}>
            <PopoverTrigger>
              <MotionIconButton
                aria-label="Chat"
                icon={<ChatIcon />}
                onClick={onOpen}
                {...buttonStyles}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              />
            </PopoverTrigger>
            <PopoverContent {...popoverContentStyles}>
              <PopoverBody p={0}>
                <HStack 
                  {...hoverMenuStyles}
                  onClick={onOpen}
                >
                  <ChatIcon color="white" boxSize={5} />
                  <Text color="white" fontSize="sm">
                    Talk to support chatbot
                  </Text>
                </HStack>
              </PopoverBody>
            </PopoverContent>
          </Popover>
        </VStack>
      </Box>

      {/* Chat Drawer */}
      <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="md">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerHeader 
            bg="brand.primary" 
            color="white" 
            px={4} 
            py={3}
            borderBottomWidth="1px"
            borderBottomColor="whiteAlpha.300"
          >
            <Flex justify="space-between" align="center">
              <HStack>
                <Avatar size="sm" name="EGY CHEM HUB" bg="white" color="brand.primary" />
                <Text fontWeight="bold">EGY CHEM HUB Support</Text>
              </HStack>
              <DrawerCloseButton position="static" color="white" />
            </Flex>
          </DrawerHeader>
          <DrawerBody p={0} display="flex" flexDirection="column">
            {/* Messages Area */}
            <Box 
              flex="1" 
              overflowY="auto" 
              p={4} 
              bg="gray.50"
            >
              <VStack spacing={4} align="stretch">
                {messages.map((message, index) => (
                  <Flex 
                    key={index} 
                    justify={message.isUser ? "flex-end" : "flex-start"}
                  >
                    <Box
                      maxW="80%"
                      bg={message.isUser ? "brand.primary" : "white"}
                      color={message.isUser ? "white" : "gray.800"}
                      p={3}
                      borderRadius="lg"
                      boxShadow="sm"
                      borderWidth={message.isUser ? 0 : 1}
                      borderColor="gray.200"
                    >
                      <Text fontSize="sm">{message.text}</Text>
                    </Box>
                  </Flex>
                ))}
              </VStack>
            </Box>

            {/* Quick Questions */}
            {messages.length < 3 && (
              <Box p={4} borderTopWidth="1px" borderTopColor="gray.200">
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Frequently Asked Questions:
                </Text>
                <Flex wrap="wrap" gap={2}>
                  {quickQuestions.map((question, index) => (
                    <Button
                      key={index}
                      size="sm"
                      variant="outline"
                      colorScheme="red"
                      onClick={() => handleSendMessage(question)}
                      mb={2}
                    >
                      {question}
                    </Button>
                  ))}
                </Flex>
              </Box>
            )}

            {/* Input Area */}
            <Box p={4} borderTopWidth="1px" borderTopColor="gray.200">
              <Flex>
                <Input
                  placeholder="Type your message..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && inputValue.trim()) {
                      handleSendMessage(inputValue);
                    }
                  }}
                  mr={2}
                />
                <Button
                  colorScheme="red"
                  onClick={() => {
                    if (inputValue.trim()) {
                      handleSendMessage(inputValue);
                    }
                  }}
                >
                  Send
                </Button>
              </Flex>
            </Box>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

  export default FloatingSidebar;
