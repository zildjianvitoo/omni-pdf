'use client';

import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import type { ImageFileItem } from '@/lib/types';
import { ImageCard } from './ImageCard';

interface ImageGridProps {
  images: ImageFileItem[];
  onReorder: (startIndex: number, endIndex: number) => void;
  onRotate: (id: string) => void;
  onRemove: (id: string) => void;
}

export function ImageGrid({ images, onReorder, onRotate, onRemove }: ImageGridProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    onReorder(result.source.index, result.destination.index);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="images-droppable" direction="horizontal">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
          >
            {images.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(dragProvided) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                  >
                    <ImageCard
                      item={item}
                      index={index}
                      onRotate={onRotate}
                      onRemove={onRemove}
                      dragHandleProps={dragProvided.dragHandleProps ?? undefined}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
