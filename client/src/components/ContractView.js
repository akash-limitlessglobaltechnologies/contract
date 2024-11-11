import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "./Navbar";
import {
  DocumentTextIcon,
  ClockIcon,
  ShareIcon,
  DownloadIcon,
} from "@heroicons/react/outline";

function ContractView() {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchContract();
  }, [id]);

  const handleDownload = async (contract, isSigned = false) => {
    try {
      const token = localStorage.getItem("token");
      const fileName = `${contract.title}-${
        isSigned ? "signed" : "original"
      }.pdf`;

      const response = await fetch(
        `http://localhost:5001/api/contracts/download/${contract._id}/${contract.signingKey}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create a URL for the blob
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" })
      );

      // Create temporary link
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);

      // Append to body, click and cleanup
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download the file. Please try again.");
    }
  };

  const handlePreview = async (contract) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5001/api/contracts/preview/${contract._id}/${contract.signingKey}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load preview");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" })
      );

      // Open in new window/tab
      window.open(url, "_blank");

      // Clean up after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error("Preview error:", error);
      alert("Failed to load preview. Please try again.");
    }
  };
  const fetchContract = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await fetch(
        `http://localhost:5001/api/contracts/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch contract");
      }

      const data = await response.json();
      setContract(data);
    } catch (error) {
      console.error("Error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getDownloadUrl = (contract) => {
    return `http://localhost:5001/api/contracts/download/${contract._id}/${contract.signingKey}`;
  };

  const getPreviewUrl = (contract) => {
    return `http://localhost:5001/api/contracts/preview/${contract._id}/${contract.signingKey}`;
  };

  const getSigningLink = (contract) => {
    return `${window.location.origin}/sign/${contract.signingKey}`;
  };

  const handleCopyLink = async () => {
    if (!contract) return;

    const signingLink = getSigningLink(contract);
    try {
      await navigator.clipboard.writeText(signingLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: "bg-yellow-100 text-yellow-800",
      signed: "bg-green-100 text-green-800",
      expired: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!contract) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {/* Header */}
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {contract.title}
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Created on {new Date(contract.createdAt).toLocaleDateString()}
                </p>
              </div>
              {getStatusBadge(contract.status)}
            </div>
          </div>

          {/* Signing Link Section */}
          <div className="px-4 py-5 sm:px-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Sharing Link
              </h4>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={getSigningLink(contract)}
                  readOnly
                  className="flex-1 p-2 text-sm bg-white border border-gray-300 rounded-md"
                />
                <button
                  onClick={handleCopyLink}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  {copySuccess ? "Copied!" : "Copy Link"}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Share this link with the recipient to sign the contract. Expires
                on {new Date(contract.expiryDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Contract Details */}
          <div className="px-4 py-5 sm:p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Recipient</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {contract.recipientEmail}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {contract.status}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">
                  Description
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {contract.description}
                </dd>
              </div>
            </dl>
          </div>

          {/* Document Preview */}
          <div className="px-4 py-5 sm:p-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Document Preview
            </h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-center">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {contract.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500">PDF Document</p>
                <div className="mt-6">
                  <button
                    onClick={() => handlePreview(contract)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <DocumentTextIcon className="-ml-1 mr-2 h-5 w-5 text-gray-400" />
                    View Document
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Download Section */}
          <div className="px-4 py-5 sm:px-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Documents
            </h3>
            <ul className="divide-y divide-gray-200">
              <li className="py-3 flex justify-between items-center">
                <div className="flex items-center">
                  <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                  <span className="ml-2 text-sm text-gray-500">
                    Original Contract
                  </span>
                </div>
                <button
                  onClick={() => handleDownload(contract, false)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <DownloadIcon className="h-4 w-4 mr-1" />
                  Download
                </button>
              </li>
              {contract.status === "signed" && (
                <li className="py-3 flex justify-between items-center">
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-5 w-5 text-green-500" />
                    <span className="ml-2 text-sm text-gray-500">
                      Signed Contract
                    </span>
                  </div>
                  <button
                    onClick={() => handleDownload(contract, true)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <DownloadIcon className="h-4 w-4 mr-1" />
                    Download
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContractView;
