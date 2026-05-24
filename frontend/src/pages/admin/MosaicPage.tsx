import React, { useState, useEffect } from "react";
import { useMosaicStore, type MosaicCard } from "../../stores/mosaic.store";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import MosaicCardModal from "../../components/admin/MosaicCardModal";

const MosaicPage: React.FC = () => {
  const { cards, loading, fetchMosaicCards, deleteMosaicCard } = useMosaicStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<MosaicCard | null>(null);

  useEffect(() => {
    fetchMosaicCards();
  }, [fetchMosaicCards]);

  const handleCreate = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const handleEdit = (card: MosaicCard) => {
    setEditing(card);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this mosaic card?")) {
      const ok = await deleteMosaicCard(id);
      if (ok) {
        toast.success("Mosaic card deleted");
        fetchMosaicCards();
      } else {
        toast.error("Failed to delete mosaic card");
      }
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditing(null);
    fetchMosaicCards();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Homepage Card Mosaic</h1>
          <p className="text-gray-600">
            Curated cards shown on the homepage between categories and deals.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-[#FFD600] text-[#333333] px-4 py-2 rounded-lg hover:bg-[#e6c100] transition-colors flex items-center justify-center gap-2 font-medium w-full sm:w-auto"
        >
          <PlusIcon className="h-5 w-5" />
          Add Card
        </button>
      </div>

      {loading && cards.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002B5B]"></div>
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-4">No mosaic cards yet.</p>
          <button
            onClick={handleCreate}
            className="bg-[#FFD600] text-[#333333] px-4 py-2 rounded-lg hover:bg-[#e6c100] transition-colors"
          >
            Create your first card
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <div
              key={card._id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="relative h-40 bg-gray-100">
                {card.type === "single" ? (
                  card.image && (
                    <img
                      src={card.image}
                      alt={card.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-0.5 h-full">
                    {(card.tiles || []).slice(0, 4).map((tile, i) => (
                      <div key={i} className="bg-gray-200 overflow-hidden">
                        {tile.image && (
                          <img
                            src={tile.image}
                            alt={tile.label || `Tile ${i + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {!card.isActive && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                    Inactive
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 flex-1 line-clamp-1">
                    {card.title}
                  </h3>
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800 capitalize shrink-0">
                    {card.type}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">Sort: {card.sortOrder}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(card)}
                    className="flex-1 bg-[var(--brand-primary)] text-white px-3 py-2 rounded-lg hover:bg-[var(--brand-accent)] transition-colors flex items-center justify-center gap-1"
                  >
                    <PencilIcon className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(card._id)}
                    className="flex-1 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <MosaicCardModal isOpen={isModalOpen} onClose={handleModalClose} card={editing} />
      )}
    </div>
  );
};

export default MosaicPage;
