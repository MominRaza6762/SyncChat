import React from "react";
import { FileText,  File, FileArchive, FileCode2 } from "lucide-react";

const getIcon = (type) => {
  switch (type) {
    case "pdf":
      return <FileText  />;
    case "docx":
    case "doc":
      return <FileText  />;
    case "ppt":
    case "pptx":
      return <FileText  />;
    case "xlsx":
    case "xls":
      return <FileText  />;
    case "zip":
    case "rar":
      return <FileArchive  />;
    case "txt":
    case "js":
    case "json":
      return <FileCode2  />;
    default:
      return <File  />;
  }
};

const CustomDocumentPreview = ({ file }) => {
  const fileType = file?.name?.split(".").pop().toLowerCase();

  return (
    <div className="document-preview">
      <div  className="document-name">{file.name}</div>
      <div  className="document-icon">{getIcon(fileType)}</div>
    </div>
  );
};

export default CustomDocumentPreview;
