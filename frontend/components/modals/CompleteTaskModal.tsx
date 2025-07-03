import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { MaintenanceTask, Part, TaskStatus } from '../../types';
import { getISODateString } from '../../utils/dateUtils';
import { v4 as uuidv4 } from 'uuid';

interface CompleteTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (task: Partial<MaintenanceTask>) => void;
  task: MaintenanceTask;
}

const CompleteTaskModal: React.FC<CompleteTaskModalProps> = ({ isOpen, onClose, onComplete, task }) => {
  const [cost, setCost] = useState(task.cost || '');
  const [notes, setNotes] = useState(task.notes || '');
  const [parts, setParts] = useState<Part[]>(task.parts || []);
  const [newPart, setNewPart] = useState<Part>({ name: '', quantity: 1 });
  const [isSaving, setIsSaving] = useState(false);

  const handleAddPart = () => {
    if (!newPart.name.trim()) return;
    setParts([...parts, newPart]);
    setNewPart({ name: '', quantity: 1 });
  };

  const handleRemovePart = (idx: number) => {
    setParts(parts.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setIsSaving(true);
    onComplete({
      id: task.id,
      status: TaskStatus.Completed,
      completedDate: getISODateString(),
      cost: cost ? Number(cost) : undefined,
      notes: notes || undefined,
      parts: parts.length > 0 ? parts : undefined,
    });
    setIsSaving(false);
    onClose();
  };

  const handleSkipAndComplete = async () => {
    setIsSaving(true);
    onComplete({
      id: task.id,
      status: TaskStatus.Completed,
      completedDate: getISODateString(),
    });
    setIsSaving(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Complete Task
        <IconButton onClick={onClose} size="large"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>{task.title}</Typography>
        <TextField
          label="Cost"
          type="number"
          value={cost}
          onChange={e => setCost(e.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          fullWidth
          margin="normal"
          multiline
          rows={2}
        />
        <Typography variant="subtitle2" sx={{ mt: 2 }}>Parts Used</Typography>
        {parts.map((part, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Typography>{part.name} (x{part.quantity})</Typography>
            <IconButton size="small" onClick={() => handleRemovePart(idx)}><CloseIcon fontSize="small" /></IconButton>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <TextField
            label="Part Name"
            value={newPart.name}
            onChange={e => setNewPart({ ...newPart, name: e.target.value })}
            size="small"
          />
          <TextField
            label="Qty"
            type="number"
            value={newPart.quantity}
            onChange={e => setNewPart({ ...newPart, quantity: Number(e.target.value) })}
            size="small"
            style={{ width: 80 }}
          />
          <Button onClick={handleAddPart} variant="outlined" size="small">Add</Button>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleSkipAndComplete} color="warning" disabled={isSaving}>Skip and Complete</Button>
        <Button onClick={handleSave} variant="contained" color="primary" disabled={isSaving}>Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CompleteTaskModal; 