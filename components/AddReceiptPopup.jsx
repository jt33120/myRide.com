import React from 'react';
import { AiOutlineClose } from 'react-icons/ai';

export default function AddReceiptPopup({ isOpen, onClose, onSubmit }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md p-6 mx-4 bg-white rounded-lg shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Add Receipt</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <AiOutlineClose size={24} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Receipt Date Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Receipt Date</label>
            <input
              type="date"
              className="block w-full p-2 mt-1 border border-gray-300 rounded-md"
              required
            />
          </div>
          {/* Amount Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount</label>
            <input
              type="number"
              step="0.01"
              className="block w-full p-2 mt-1 border border-gray-300 rounded-md"
              required
            />
          </div>
          {/* Description Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              className="block w-full p-2 mt-1 border border-gray-300 rounded-md"
              rows="3"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-800 bg-gray-300 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Add Receipt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
