import { HStack, Button, Text, Select } from '@chakra-ui/react'
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons'

interface PaginationProps {
  currentPage: number
  totalPages: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange: (items: number) => void
}

const Pagination = ({
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}: PaginationProps) => {
  return (
    <HStack spacing={4} justify="space-between" w="full" py={4}>
      <HStack spacing={2}>
        <Text fontSize="sm" color="gray.600">
          Show
        </Text>
        <Select
          size="sm"
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          w="70px"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </Select>
      </HStack>

      <HStack spacing={2}>
        <Button
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          isDisabled={currentPage === 1}
          leftIcon={<ChevronLeftIcon />}
          variant="ghost"
        />
        
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <Button
            key={page}
            size="sm"
            variant={currentPage === page ? "solid" : "ghost"}
            colorScheme={currentPage === page ? "red" : "gray"}
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        ))}

        <Button
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          isDisabled={currentPage === totalPages}
          rightIcon={<ChevronRightIcon />}
          variant="ghost"
        />
      </HStack>
    </HStack>
  )
}

export default Pagination