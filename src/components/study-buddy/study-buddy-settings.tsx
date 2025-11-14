
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface FallbackModel {
  id: string;
  name: string;
}

function SortableItem({ id, name }: { id: string, name: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="flex items-center gap-2 p-2 bg-gray-100 rounded-md">
      <Button {...listeners} variant="ghost" size="sm" className="cursor-grab">
        <GripVertical className="h-4 w-4" />
      </Button>
      <span>{name}</span>
    </div>
  );
}

export function StudyBuddySettings({ onUpdateSettings }: { onUpdateSettings: (settings: { fallbackModels: FallbackModel[] }) => void }) {
  const [fallbackModels, setFallbackModels] = useState<FallbackModel[]>([
    { id: 'gemini', name: 'Gemini' },
    { id: 'groq', name: 'Groq' },
    { id: 'cerebras', name: 'Cerebras' },
    { id: 'cohere', name: 'Cohere' },
    { id: 'mistral', name: 'Mistral' },
    { id: 'openrouter', name: 'OpenRouter' },
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFallbackModels((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  const handleSaveChanges = () => {
    onUpdateSettings({ fallbackModels });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Study Buddy Settings</CardTitle>
        <CardDescription>Customize the behavior of your Study Buddy.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>Fallback Model Priority</Label>
            <p className="text-sm text-muted-foreground">
              Drag and drop the models to set the fallback priority. The top model will be used first.
            </p>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={fallbackModels} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {fallbackModels.map(model => (
                  <SortableItem key={model.id} id={model.id} name={model.name} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSaveChanges}>Save Changes</Button>
      </CardFooter>
    </Card>
  );
}
