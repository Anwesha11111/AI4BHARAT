import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

export const uploadTender = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axios.post(`${API_BASE_URL}/upload/tender`, formData);
  return response.data;
};

export const getCriteria = async (tenderId: number) => {
  const response = await axios.get(`${API_BASE_URL}/tenders/${tenderId}/criteria`);
  return response.data;
};

export const uploadBidder = async (tenderId: number, vendorName: string, files: File[]) => {
  const formData = new FormData();
  formData.append('tender_id', String(tenderId));
  formData.append('vendor_name', vendorName);
  files.forEach((file) => formData.append('files', file));

  const response = await axios.post(`${API_BASE_URL}/upload/bidder`, formData);
  return response.data;
};

export const getScorecard = async (tenderId: number) => {
  const response = await axios.get(`${API_BASE_URL}/tenders/${tenderId}/scorecard`);
  return response.data;
};

export const getTenderStatus = async (tenderId: number) => {
  const response = await axios.get(`${API_BASE_URL}/tenders/${tenderId}/status`);
  return response.data;
};

export const reviewVerdict = async (verdictId: number, status: string, reason: string, actor: string) => {
  const response = await axios.patch(`${API_BASE_URL}/verdicts/${verdictId}/review`, null, {
    params: { id: verdictId, status, reason, actor }
  });
  return response.data;
};
