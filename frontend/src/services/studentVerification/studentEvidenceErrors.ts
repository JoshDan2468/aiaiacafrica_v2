export function uploadError(status: number) {
  if (status === 400) return "This file is not accepted. Use a genuine PDF, JPEG, or PNG file.";
  if (status === 401) return "Your secure upload session has expired or is invalid.";
  if (status === 409) return "This evidence cannot be changed in its current state.";
  if (status === 413) return "The file exceeds the 5 MB limit.";
  if (status === 429) return "Too many upload attempts. Please wait and try again.";
  return "The evidence service is temporarily unavailable. Please try again.";
}
