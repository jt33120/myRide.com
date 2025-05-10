import React, { useState } from 'react';

export default function ReceiptForm({ id, isEditing, receiptData, onClose, onSave }) {
  const [title, setTitle] = useState(receiptData?.title || '');
  const [price, setPrice] = useState(receiptData?.price || '');
  const [date, setDate] = useState(
    receiptData ? new Date(receiptData.date.seconds * 1000).toISOString().substr(0,10) : ''
  );

  const handleSubmit = e => {
    e.preventDefault();
    onSave({
      title,
      price,
      date: { seconds: Math.floor(new Date(date).getTime() / 1000) }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <form
        onSubmit={handleSubmit}
        className="p-6 space-y-4 bg-white rounded w-80"
      >
        <h2 className="text-xl font-semibold">
          {isEditing ? 'Edit Receipt' : 'New Receipt'}
        </h2>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
        <input
          type="number"
          placeholder="Price"
          value={price}
          onChange={e => setPrice(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
        <div className="flex justify-end space-x-2">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 text-white bg-purple-600 rounded">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
