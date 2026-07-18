import { CheckCircle2, ImageIcon, UploadIcon } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router";
import {
  ACCEPTED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_SIZE_BYTES,
  PROGRESS_INTERVAL_MS,
  PROGRESS_STEP,
  REDIRECT_DELAY_MS,
} from "../lib/constants";

type UploadProps = {
  onComplete?: (base64: string) => void;
};

const Upload = ({ onComplete = () => {} }: UploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);

  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const readerRef = useRef<FileReader | null>(null);
  const { isSignedIn } = useOutletContext<AuthContext>();

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (readerRef.current) {
        readerRef.current.abort();
        readerRef.current = null;
      }
    };
  }, []);

  const processFile = (files: FileList | null) => {
    if (!isSignedIn) {
      return;
    }

    const selectedFile = files?.[0];

    if (!selectedFile) {
      return;
    }

    if (
      !ACCEPTED_UPLOAD_MIME_TYPES.includes(selectedFile.type) ||
      selectedFile.size > MAX_UPLOAD_SIZE_BYTES
    ) {
      return;
    }

    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (readerRef.current) {
      readerRef.current.abort();
    }

    setFile(selectedFile);
    setProgress(0);
    setIsDragging(false);

    const reader = new FileReader();
    readerRef.current = reader;

    reader.onload = () => {
      if (readerRef.current !== reader) {
        return;
      }

      const result = reader.result;

      if (typeof result !== "string") {
        return;
      }

      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }

      readerRef.current = null;

      intervalRef.current = window.setInterval(() => {
        setProgress((currentProgress) => {
          const nextProgress = Math.min(currentProgress + PROGRESS_STEP, 100);

          if (nextProgress >= 100) {
            if (intervalRef.current) {
              window.clearInterval(intervalRef.current);
              intervalRef.current = null;
            }

            if (timeoutRef.current) {
              window.clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = window.setTimeout(() => {
              onComplete(result);
            }, REDIRECT_DELAY_MS);

            return 100;
          }

          return nextProgress;
        });
      }, PROGRESS_INTERVAL_MS);
    };

    reader.onerror = () => {
      if (readerRef.current !== reader) {
        return;
      }

      readerRef.current = null;
      setFile(null);
      setProgress(0);
    };

    reader.readAsDataURL(selectedFile);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (!isSignedIn) {
      return;
    }

    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (!isSignedIn) {
      return;
    }

    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    processFile(event.dataTransfer.files);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    processFile(event.target.files);
    event.target.value = "";
  };

  return (
    <div className="upload">
      {!file ? (
        <div
          className={`dropzone ${isDragging ? "is-dragging" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            className="drop-input"
            accept=".jpg,.jpeg,.png"
            disabled={!isSignedIn}
            onChange={handleChange}
          />
          <div className="drop-content">
            <div className="drop-icon">
              <UploadIcon size={20} />
            </div>
            <p>
              {isSignedIn
                ? "Click to upload or just drag and drop"
                : "Sign in or Sign up with puter to upload"}
            </p>
            <p className="help">Maximum file size 10MB</p>
          </div>
        </div>
      ) : (
        <div className="upload-status">
          <div className="status-content">
            <div className="status-icon">
              {progress == 100 ? (
                <CheckCircle2 className="check" />
              ) : (
                <ImageIcon className="image" />
              )}
            </div>
            <h3>{file.name}</h3>
            <div className="progress">
              <div className="bar" style={{ width: `${progress}%` }} />
              <p className="status-text">
                {progress < 100 ? "Analysing floor plan..." : "Redirecting..."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Upload;
