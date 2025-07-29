import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Heading,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  VStack,
  HStack,
  Text,
  Card,
  CardBody,
  Badge,
  IconButton,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  Stack,
  Select,
} from '@chakra-ui/react';
import { SearchIcon, AddIcon, ChatIcon, DeleteIcon, ViewIcon } from '@chakra-ui/icons';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragMoveEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AdminProtectedRoute from './AdminProtectedRoute';
import CRMQuoteHistory from './CRMQuoteHistory';
import CRMItemDetailsModal from './CRMItemDetailsModal';
import { useCRMStore } from '../../stores/crm.store';
import { CRMItem, CRMColumn } from '../../types/crmQuote';


const CustomerCard = ({ 
  item, 
  onViewHistory,
  onViewDetails
}: { 
  item: CRMItem;
  onViewHistory: (itemId: string, customerName: string) => void;
  onViewDetails: (item: CRMItem) => void;
}) => {
  // Extract customer info from userDetails if available, otherwise from data
  const getCustomerInfo = () => {
    // Map source to user-friendly label
    const getSourceLabel = (src: string) => {
      if (src === 'gitCode') return 'Get quote';
      if (src === 'supplier') return 'Supplier';
      return src;
    };
    if (item.userDetails) {
      return {
        name: item.userDetails.username || 'Unknown',
        email: item.userDetails.email || 'No email',
        company: item.userDetails.companyName || '',
        source: getSourceLabel(item.source)
      };
    } else if (item.source === 'gitCode' && item.data) {
      return {
        name: item.data.fullName || item.data.name || 'Unknown',
        email: item.data.email || 'No email',
        company: item.data.company || '',
        source: getSourceLabel(item.source)
      };
    } else if (item.source === 'supplier' && item.data) {
      return {
        name: item.data.companyName || item.data.name || 'Unknown',
        email: item.data.email || 'No email',
        company: item.data.companyName || '',
        source: getSourceLabel(item.source)
      };
    }
    return {
      name: 'Unknown',
      email: 'No email',
      company: '',
      source: item.source
    };
  };

  const customer = getCustomerInfo();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Determine quote status indicators
  const hasQuotes = (item.quoteCount || 0) > 0;
  const hasActiveQuote = item.hasActiveQuote || false;

  // Determine badge color
  const sourceColor = item.source === 'gitCode' ? 'blue.400' : item.source === 'supplier' ? 'green.400' : 'gray.400';

  // Handle card click to open details modal
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open modal if clicking on action buttons or if dragging
    if (e.target !== e.currentTarget && (e.target as HTMLElement).closest('button')) {
      return;
    }
    onViewDetails(item);
  };

  return (
    <Card 
      ref={setNodeRef}
      style={{ ...style, touchAction: 'manipulation' }}
      size="sm" 
      bg={isDragging ? "blue.50" : "white"} 
      boxShadow={isDragging ? "lg" : "sm"} 
      borderRadius="md" 
      mb={3}
      position="relative"
      opacity={isDragging ? 0.5 : 1}
      cursor="pointer"
      onClick={handleCardClick}
      _hover={{ boxShadow: "md" }}
      transition="box-shadow 0.2s"
    >
      {/* Left colored badge/stripe */}
      <Box
        position="absolute"
        left={0}
        top={0}
        bottom={0}
        width="6px"
        borderTopLeftRadius="md"
        borderBottomLeftRadius="md"
        bg={sourceColor}
        zIndex={1}
      />
      <CardBody p={3} pl={5 /* add space for the badge */}>
        {/* Draggable area */}
        <Box 
          {...attributes}
          {...listeners}
          cursor="grab"
          _active={{ cursor: "grabbing" }}
          mb={2}
          onClick={(e) => e.stopPropagation()} // Prevent card click when dragging
          sx={{ touchAction: 'none' }}
        >
          <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>
            <Text as="span" fontWeight="normal">{customer.name}</Text>
          </Text>
          <Text fontSize="sm" color="gray.600" mb={1} noOfLines={1}>
            {customer.email}
          </Text>
          {customer.company && (
            <Text fontSize="xs" color="gray.500" mb={1} noOfLines={1}>
              {customer.company}
            </Text>
          )}
          <Text fontSize="xs" color="gray.500">
            Source: {customer.source}
          </Text>
        </Box>

        {/* Quote status indicators */}
        {hasQuotes && (
          <HStack spacing={1} mb={2}>
            <Badge 
              size="sm" 
              colorScheme={hasActiveQuote ? "orange" : "green"}
              variant="subtle"
            >
              {item.quoteCount} quote{(item.quoteCount || 0) !== 1 ? 's' : ''}
            </Badge>
            {hasActiveQuote && (
              <Badge size="sm" colorScheme="orange" variant="outline">
                Active
              </Badge>
            )}
          </HStack>
        )}

        {/* Action buttons */}
        <HStack spacing={1} justify="flex-end">
          <IconButton
            aria-label="View details"
            icon={<ViewIcon />}
            size="xs"
            colorScheme="blue"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(item);
            }}
            title="View full details"
          />
          {hasQuotes && (
            <IconButton
              aria-label="View quote history"
              icon={<ChatIcon />}
              size="xs"
              colorScheme="purple"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onViewHistory(item._id, customer.name);
              }}
              title="View quote history"
            />
          )}
        </HStack>
      </CardBody>
    </Card>
  );
};

const CRMColumnComponent = ({ 
  column, 
  onViewHistory,
  onViewDetails,
  onDelete,
}: { 
  column: CRMColumn;
  onViewHistory: (itemId: string, customerName: string) => void;
  onViewDetails: (item: CRMItem) => void;
  onDelete: (columnId: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: column.id,
    data: {
      type: 'column',
      columnId: column.id,
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      bg="gray.100"
      borderRadius="lg"
      p={3}
      minH="400px"
      border="1px solid"
      borderColor="gray.200"
      opacity={isDragging ? 0.5 : 1}
    >
      {/* Column Header */}
      <Flex justify="space-between" align="center" mb={3}
        {...attributes}
        {...listeners}
        cursor="grab"
        _active={{ cursor: "grabbing" }}
      >
        <VStack align="flex-start" spacing={0}>
          <Text 
            fontSize="md" 
            fontWeight="semibold" 
            color="gray.700"
          >
            {column.title}
          </Text>
          <Text fontSize="xs" color="gray.500">
            {
              column.items.filter(
                item =>
                  item.userDetails ||
                  (item.data && (item.data.email || item.data.name || item.data.fullName))
              ).length
            } items
          </Text>
        </VStack>
        <IconButton
          aria-label="Delete column"
          icon={<DeleteIcon />}
          size="xs"
          variant="ghost"
          color="gray.400"
          _hover={{ color: "red.500" }}
          onClick={() => onDelete(column.id)}
        />
      </Flex>

      {/* Items */}
      <SortableContext 
        items={column.items.map(item => item._id)}
        strategy={verticalListSortingStrategy}
      >
        <VStack spacing={2} align="stretch">
          {column.items
            .filter(item =>
              item.userDetails ||
              (item.data && (item.data.email || item.data.name || item.data.fullName))
            )
            .map((item) => (
              <CustomerCard
                key={item._id}
                item={item}
                onViewHistory={onViewHistory}
                onViewDetails={onViewDetails}
              />
            ))}
        </VStack>
      </SortableContext>
    </Box>
  );
};

const AdminCRM = () => {
  return (
    <AdminProtectedRoute>
      <AdminCRMMainView />
    </AdminProtectedRoute>
  );
};

const AdminCRMMainView = () => {
  const [search, setSearch] = useState('');
  const { columns, loading, error, getCRMData, updateItemColumn, createColumn, deleteColumn, reorderColumns, reorderItemsInColumn } = useCRMStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Quote history states
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedCRMId, setSelectedCRMId] = useState<string>('');
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>('');
  
  // Details modal states
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CRMItem | null>(null);
  
  // Create column states
  const [isCreateColumnModalOpen, setCreateColumnModalOpen] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [isCreatingColumn, setCreatingColumn] = useState(false);
  
  // Delete column states
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteAction, setDeleteAction] = useState('move');
  const [moveTargetColumn, setMoveTargetColumn] = useState('new');
  
  const toast = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    getCRMData();
  }, [getCRMData]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const isColumnDrag = columns.some((c) => c.id === activeId);

    if (isColumnDrag) {
      const oldIndex = columns.findIndex((c) => c.id === activeId);
      const newIndex = columns.findIndex((c) => c.id === overId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reorderedColumns = arrayMove(columns, oldIndex, newIndex);
        useCRMStore.setState({ columns: reorderedColumns });
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const isColumnDrag = columns.some(c => c.id === activeId);

    if (isColumnDrag) {
      if (active.id !== over.id) {
        const reordered = useCRMStore.getState().columns;
        const updateData = reordered.map((col, index) => ({ id: col.id, order: index }));

        try {
          await reorderColumns(updateData);
          toast({ title: 'Columns reordered', status: 'success', duration: 2000, isClosable: true });
        } catch (err) {
          toast({ title: 'Error reordering columns', description: err instanceof Error ? err.message : 'Failed to save order.', status: 'error', duration: 3000, isClosable: true });
          getCRMData();
        }
      }
    } else {
      // Handle item drag
      const sourceColumn = columns.find(c => c.items.some(i => i._id === activeId));
      const draggedItem = sourceColumn?.items.find(i => i._id === activeId);

      let destinationColumn = columns.find(c => c.id === overId || c.items.some(i => i._id === overId));
      
      const columnIdFromData = over.data?.current?.columnId;
      if (!destinationColumn && columnIdFromData) {
        destinationColumn = columns.find(c => c.id === columnIdFromData);
      }

      if (!sourceColumn || !draggedItem || !destinationColumn) {
        return;
      }

      // Check if it's a reorder within the same column
      if (sourceColumn.id === destinationColumn.id) {
        const oldIndex = sourceColumn.items.findIndex(i => i._id === activeId);
        const newIndex = sourceColumn.items.findIndex(i => i._id === overId);
        
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const reorderedItems = arrayMove(sourceColumn.items, oldIndex, newIndex);
          const newColumns = columns.map(col => 
            col.id === sourceColumn.id 
              ? { ...col, items: reorderedItems }
              : col
          );
          useCRMStore.setState({ columns: newColumns });

          try {
            await reorderItemsInColumn(sourceColumn.id, reorderedItems.map(item => item._id));
            toast({ title: 'Items reordered', status: 'success', duration: 2000, isClosable: true });
          } catch (err) {
            toast({ title: 'Error reordering items', description: err instanceof Error ? err.message : 'Failed to save order.', status: 'error', duration: 3000, isClosable: true });
            getCRMData();
          }
        }
      } else {
        // Move item to different column
        if (!destinationColumn) {
          return; // Exit if no destination column found
        }
        
        const newColumns = columns.map(col => {
          if (col.id === sourceColumn.id) {
            return { ...col, items: col.items.filter(i => i._id !== activeId) };
          }
          if (col.id === destinationColumn!.id) {
            return { ...col, items: [...col.items, draggedItem] };
          }
          return col;
        });
        useCRMStore.setState({ columns: newColumns });

        try {
          await updateItemColumn(activeId, destinationColumn!.id);
          toast({ title: 'Item moved', status: 'success', duration: 2000, isClosable: true });
        } catch (err) {
          toast({ title: 'Error moving item', description: err instanceof Error ? err.message : 'Failed to move item.', status: 'error', duration: 3000, isClosable: true });
          getCRMData();
        }
      }
    }
  };

  const handleCreateColumn = async () => {
    if (!newColumnTitle.trim()) {
      toast({
        title: 'Column title is required',
        status: 'warning',
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    setCreatingColumn(true);
    try {
      await createColumn(newColumnTitle);
      toast({
        title: 'Column created',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      setCreateColumnModalOpen(false);
      setNewColumnTitle('');
    } catch (err) {
      toast({
        title: 'Error creating column',
        description: err instanceof Error ? err.message : 'An unknown error occurred.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setCreatingColumn(false);
    }
  };

  const handleDeleteColumn = async () => {
    if (!columnToDelete) return;

    setIsDeleting(true);
    try {
      await deleteColumn(columnToDelete, deleteAction, moveTargetColumn);
      toast({
        title: 'Column deleted successfully',
        description: `Items were handled with the action: ${deleteAction}.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      setDeleteConfirmOpen(false);
      setColumnToDelete(null);
    } catch (err) {
      toast({
        title: 'Error deleting column',
        description: err instanceof Error ? err.message : 'An unknown error occurred.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Quote history handlers
  const handleViewHistory = (itemId: string, customerName: string) => {
    setSelectedCRMId(itemId);
    setSelectedCustomerName(customerName);
    setIsHistoryOpen(true);
  };

  const handleViewDetails = (item: CRMItem) => {
    setSelectedItem(item);
    setIsDetailsModalOpen(true);
  };

  if (loading && columns.length === 0) {
    return (
      <Box p={12}>
        <Flex justify="center" align="center" h="400px">
          <Spinner size="xl" color="blue.500" />
        </Flex>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={12}>
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
        <Button onClick={() => getCRMData()}>Try Again</Button>
      </Box>
    );
  }

  return (
    <Box p={6} overflowX="hidden">
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg" color="gray.700">CRM</Heading>
        <Flex gap={4} align="center">
          <InputGroup maxW="400px">
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.400" />
            </InputLeftElement>
            <Input 
              placeholder="Search" 
              borderRadius="md" 
              bg="white"
              border="1px solid"
              borderColor="gray.300"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
          <Button
            leftIcon={<AddIcon />}
            bg="#B40519"
            color="white"
            _hover={{ bg: '#8B0000' }}
            borderRadius="md"
            px={6}
            onClick={() => setCreateColumnModalOpen(true)}
          >
            Create
          </Button>
        </Flex>
      </Flex>

      {/* CRM Columns */}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={columns.map(col => col.id)}
          strategy={horizontalListSortingStrategy}
        >
          <HStack spacing={6} align="flex-start" overflowX="auto" py={4}>
            {columns.length === 0 ? (
              <Box textAlign="center" py={12} flex={1}>
                <Text fontSize="lg" color="gray.500">No CRM columns found</Text>
                <Text fontSize="sm" color="gray.400" mt={2}>Create your first column to get started</Text>
              </Box>
            ) : (
              columns.map((column) => (
                <Box key={column.id} minW="350px" maxW="350px" flex="1 0 auto">
                  <CRMColumnComponent 
                    column={column}
                    onViewHistory={handleViewHistory}
                    onViewDetails={handleViewDetails}
                    onDelete={(columnId) => {
                      setColumnToDelete(columnId);
                      setDeleteAction('move');
                      setMoveTargetColumn('new');
                      setDeleteConfirmOpen(true);
                    }}
                  />
                </Box>
              ))
            )}
          </HStack>
        </SortableContext>
        
        <DragOverlay>
          {activeId ? (
            (() => {
              const isColumn = columns.some(c => c.id === activeId);
              if (isColumn) {
                const column = columns.find(c => c.id === activeId);
                return column ? (
                  <CRMColumnComponent 
                    column={column} 
                    onViewHistory={() => {}} 
                    onViewDetails={() => {}}
                    onDelete={() => {}} 
                  />
                ) : null;
              }

              // Find the active item
              for (const column of columns) {
                const item = column.items.find(item => item._id === activeId);
                if (item) {
                  return (
                    <CustomerCard 
                      item={item}
                      onViewHistory={handleViewHistory}
                      onViewDetails={handleViewDetails}
                    />
                  );
                }
              }
              // Handle column dragging overlay if necessary in future
              return null;
            })()
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Delete Column Confirmation Modal */}
      <Modal isOpen={isDeleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Column</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Are you sure you want to delete this column? Choose what to do with the items inside it.</Text>
            
            <FormControl as="fieldset" mt={4}>
              <FormLabel as="legend">Action for items:</FormLabel>
              <RadioGroup onChange={setDeleteAction} value={deleteAction}>
                <Stack spacing={2}>
                  <Radio value="move">Move to another column</Radio>
                  <Radio value="archive">Archive all items</Radio>
                  <Radio value="delete" colorScheme="red">
                    <Text color="red.600">Delete all items permanently</Text>
                  </Radio>
                </Stack>
              </RadioGroup>
            </FormControl>

            {deleteAction === 'move' && (
              <FormControl mt={4}>
                <FormLabel htmlFor="move-target">Move items to:</FormLabel>
                <Select
                  id="move-target"
                  value={moveTargetColumn}
                  onChange={(e) => setMoveTargetColumn(e.target.value)}
                >
                  {columns
                    .filter((c) => c.id !== columnToDelete)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                </Select>
              </FormControl>
            )}

          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={handleDeleteColumn}
              isLoading={isDeleting}
            >
              Confirm Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Create Column Modal */}
      <Modal isOpen={isCreateColumnModalOpen} onClose={() => setCreateColumnModalOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Column</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl isRequired>
              <FormLabel>Column Title</FormLabel>
              <Input
                placeholder="e.g. 'Qualified Leads'"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateColumn()}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setCreateColumnModalOpen(false)}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleCreateColumn}
              isLoading={isCreatingColumn}
            >
              Create Column
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Quote History Modal */}
      <CRMQuoteHistory
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        crmItemId={selectedCRMId}
        customerName={selectedCustomerName}
      />

      {/* CRM Item Details Modal */}
      <CRMItemDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        item={selectedItem}
      />
    </Box>
  );
};

export default AdminCRM; 