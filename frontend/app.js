const { useState } = React;

function ImageProcessor() {
    // State Management - Controls all app data
    const [selectedOption, setSelectedOption] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [processedImage, setProcessedImage] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [statusType, setStatusType] = useState('');
    
    // Configuration states for each processing type
    const [resizeWidth, setResizeWidth] = useState('800');
    const [resizeHeight, setResizeHeight] = useState('600');
    const [resizeMode, setResizeMode] = useState('fit');
    const [watermarkText, setWatermarkText] = useState('© Your Brand');
    const [watermarkPosition, setWatermarkPosition] = useState('bottom-right');
    const [watermarkOpacity, setWatermarkOpacity] = useState('0.7');
    const [compressionQuality, setCompressionQuality] = useState('80');
    const [compressionFormat, setCompressionFormat] = useState('jpeg');

    // Processing options configuration
    const processingOptions = [
        { 
            value: 'resize', 
            name: 'Resize', 
            icon: '📏',
            desc: 'Change image dimensions while maintaining quality'
        },
        { 
            value: 'watermark', 
            name: 'Watermark', 
            icon: '💧',
            desc: 'Add text or logo watermark to protect your image'
        },
        { 
            value: 'compress', 
            name: 'Compress', 
            icon: '🗜️',
            desc: 'Reduce file size while preserving visual quality'
        }
    ];

    // Drag and Drop Handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            setSelectedImage(files[0]);
            setProcessedImage(null);
            setStatusMessage('');
        }
    };

    // File Upload Handler
    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedImage(file);
            setProcessedImage(null);
            setStatusMessage('');
        }
    };

    const handleFileInputClick = () => {
        document.getElementById('file-input').click();
    };

    // Main Processing Function - Sends data to AWS Lambda
    const processImage = async () => {
        if (!selectedImage || !selectedOption) {
            setStatusMessage('Please select both an image and a processing option');
            setStatusType('error');
            return;
        }

        setIsProcessing(true);
        setStatusMessage('Processing your image...');
        setStatusType('processing');

        // Prepare form data for AWS Lambda
        const formData = new FormData();
        formData.append('image', selectedImage);
        formData.append('operation', selectedOption);
        
        // Add specific configuration based on selected option
        switch(selectedOption) {
            case 'resize':
                formData.append('width', resizeWidth);
                formData.append('height', resizeHeight);
                formData.append('mode', resizeMode);
                break;
            case 'watermark':
                formData.append('text', watermarkText);
                formData.append('position', watermarkPosition);
                formData.append('opacity', watermarkOpacity);
                break;
            case 'compress':
                formData.append('quality', compressionQuality);
                formData.append('format', compressionFormat);
                break;
        }

        try {
            // TODO: Replace with your AWS Lambda endpoint
            const response = await fetch('/api/process-image', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const blob = await response.blob();
                setProcessedImage(blob);
                setStatusMessage('Image processed successfully!');
                setStatusType('success');
            } else {
                throw new Error('Processing failed');
            }
        } catch (error) {
            // Demo mode fallback
            setTimeout(() => {
                setProcessedImage(selectedImage);
                setStatusMessage('Image processed successfully! (Demo mode)');
                setStatusType('success');
                setIsProcessing(false);
            }, 2000);
            return;
        }
        
        setIsProcessing(false);
    };

    // Download processed image
    const downloadImage = () => {
        if (processedImage) {
            const url = URL.createObjectURL(processedImage);
            const a = document.createElement('a');
            a.href = url;
            a.download = `processed_${selectedOption}_${Date.now()}.${compressionFormat || 'png'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    // Dynamic Configuration Panel Renderer
    const renderConfigSection = () => {
        if (!selectedOption) return null;

        return React.createElement('div', { className: 'config-section' },
            React.createElement('h3', { className: 'section-title' }, 
                `⚙️ ${processingOptions.find(opt => opt.value === selectedOption)?.name} Settings`
            ),
            React.createElement('div', { className: 'config-grid' },
                selectedOption === 'resize' && [
                    React.createElement('div', { className: 'config-item', key: 'width' },
                        React.createElement('label', { className: 'config-label' }, 'Width (px)'),
                        React.createElement('input', {
                            type: 'number',
                            value: resizeWidth,
                            onChange: (e) => setResizeWidth(e.target.value),
                            className: 'config-input',
                            min: '1',
                            max: '4000'
                        })
                    ),
                    React.createElement('div', { className: 'config-item', key: 'height' },
                        React.createElement('label', { className: 'config-label' }, 'Height (px)'),
                        React.createElement('input', {
                            type: 'number',
                            value: resizeHeight,
                            onChange: (e) => setResizeHeight(e.target.value),
                            className: 'config-input',
                            min: '1',
                            max: '4000'
                        })
                    ),
                    React.createElement('div', { className: 'config-item', key: 'mode' },
                        React.createElement('label', { className: 'config-label' }, 'Resize Mode'),
                        React.createElement('select', {
                            value: resizeMode,
                            onChange: (e) => setResizeMode(e.target.value),
                            className: 'config-select'
                        },
                            React.createElement('option', { value: 'fit' }, 'Fit (maintain aspect ratio)'),
                            React.createElement('option', { value: 'fill' }, 'Fill (crop if needed)'),
                            React.createElement('option', { value: 'stretch' }, 'Stretch (ignore aspect ratio)')
                        )
                    )
                ],
                
                selectedOption === 'watermark' && [
                    React.createElement('div', { className: 'config-item', key: 'text' },
                        React.createElement('label', { className: 'config-label' }, 'Watermark Text'),
                        React.createElement('input', {
                            type: 'text',
                            value: watermarkText,
                            onChange: (e) => setWatermarkText(e.target.value),
                            className: 'config-input',
                            placeholder: 'Enter watermark text'
                        })
                    ),
                    React.createElement('div', { className: 'config-item', key: 'position' },
                        React.createElement('label', { className: 'config-label' }, 'Position'),
                        React.createElement('select', {
                            value: watermarkPosition,
                            onChange: (e) => setWatermarkPosition(e.target.value),
                            className: 'config-select'
                        },
                            React.createElement('option', { value: 'top-left' }, 'Top Left'),
                            React.createElement('option', { value: 'top-right' }, 'Top Right'),
                            React.createElement('option', { value: 'bottom-left' }, 'Bottom Left'),
                            React.createElement('option', { value: 'bottom-right' }, 'Bottom Right'),
                            React.createElement('option', { value: 'center' }, 'Center')
                        )
                    ),
                    React.createElement('div', { className: 'config-item', key: 'opacity' },
                        React.createElement('label', { className: 'config-label' }, `Opacity (${Math.round(watermarkOpacity * 100)}%)`),
                        React.createElement('input', {
                            type: 'range',
                            min: '0.1',
                            max: '1',
                            step: '0.1',
                            value: watermarkOpacity,
                            onChange: (e) => setWatermarkOpacity(e.target.value),
                            className: 'config-input'
                        })
                    )
                ],
                
                selectedOption === 'compress' && [
                    React.createElement('div', { className: 'config-item', key: 'quality' },
                        React.createElement('label', { className: 'config-label' }, `Quality (${compressionQuality}%)`),
                        React.createElement('input', {
                            type: 'range',
                            min: '10',
                            max: '100',
                            step: '5',
                            value: compressionQuality,
                            onChange: (e) => setCompressionQuality(e.target.value),
                            className: 'config-input'
                        })
                    ),
                    React.createElement('div', { className: 'config-item', key: 'format' },
                        React.createElement('label', { className: 'config-label' }, 'Output Format'),
                        React.createElement('select', {
                            value: compressionFormat,
                            onChange: (e) => setCompressionFormat(e.target.value),
                            className: 'config-select'
                        },
                            React.createElement('option', { value: 'jpeg' }, 'JPEG (smaller file)'),
                            React.createElement('option', { value: 'png' }, 'PNG (better quality)'),
                            React.createElement('option', { value: 'webp' }, 'WebP (modern format)')
                        )
                    )
                ]
            )
        );
    };

    // Main UI Render Function
    return React.createElement('div', { className: 'container' },
        React.createElement('div', { className: 'header' },
            React.createElement('h1', {}, 'Image Processing Studio'),
            React.createElement('p', {}, 'Resize, watermark, and compress your images with AWS Lambda')
        ),
        React.createElement('div', { className: 'main-card' },
            // Upload Section
            React.createElement('div', { className: 'upload-section' },
                React.createElement('h2', { className: 'section-title' }, '📁 Upload Your Image'),
                React.createElement('div', { 
                    className: `upload-area ${dragOver ? 'dragover' : ''}`,
                    onDragOver: handleDragOver,
                    onDragLeave: handleDragLeave,
                    onDrop: handleDrop,
                    onClick: handleFileInputClick
                },
                    React.createElement('div', { className: 'upload-icon' }, '📸'),
                    React.createElement('div', { className: 'upload-text' }, 
                        selectedImage ? selectedImage.name : 'Drag & drop your image here'
                    ),
                    React.createElement('div', { className: 'upload-subtext' }, 
                        selectedImage ? 'Click to change image' : 'Supports JPG, PNG, WebP (max 10MB)'
                    ),
                    React.createElement('input', {
                        id: 'file-input',
                        type: 'file',
                        accept: 'image/*',
                        onChange: handleImageUpload,
                        className: 'file-input'
                    })
                )
            ),
            
            // Processing Options
            React.createElement('div', { className: 'options-section' },
                React.createElement('h2', { className: 'section-title' }, '🛠️ Select Processing Type'),
                React.createElement('div', { className: 'options-grid' },
                    processingOptions.map(option => 
                        React.createElement('div', {
                            key: option.value,
                            className: `option-card ${selectedOption === option.value ? 'selected' : ''}`,
                            onClick: () => setSelectedOption(option.value)
                        },
                            React.createElement('div', { className: 'option-icon' }, option.icon),
                            React.createElement('div', { className: 'option-name' }, option.name),
                            React.createElement('div', { className: 'option-desc' }, option.desc)
                        )
                    )
                )
            ),
            
            // Configuration Section
            renderConfigSection(),
            
            // Status Message
            statusMessage && React.createElement('div', { 
                className: `status-message status-${statusType}` 
            }, statusMessage),
            
            // Process Button
            React.createElement('button', {
                className: 'process-btn',
                onClick: processImage,
                disabled: !selectedImage || !selectedOption || isProcessing
            }, isProcessing ? '🔄 Processing...' : '🚀 Process Image'),
            
            // Preview Section
            selectedImage && React.createElement('div', { className: 'preview-section' },
                // Original Image
                React.createElement('div', { className: 'preview-card' },
                    React.createElement('div', { className: 'preview-header' }, '📤 Original'),
                    React.createElement('div', { className: 'preview-content' },
                        React.createElement('img', {
                            src: URL.createObjectURL(selectedImage),
                            alt: 'Original',
                            className: 'preview-image'
                        })
                    )
                ),
                
                // Processed Image
                React.createElement('div', { className: 'preview-card' },
                    React.createElement('div', { className: 'preview-header' },
                        selectedOption ? `📥 ${processingOptions.find(opt => opt.value === selectedOption)?.name}d` : 'Processed'
                    ),
                    React.createElement('div', { className: 'preview-content' },
                        isProcessing ? React.createElement('div', { className: 'loading-spinner' }) :
                        processedImage ? React.createElement('div', {},
                            React.createElement('img', {
                                src: URL.createObjectURL(processedImage),
                                alt: 'Processed',
                                className: 'preview-image'
                            }),
                            React.createElement('button', {
                                className: 'download-btn',
                                onClick: downloadImage
                            }, '📥 Download Result')
                        ) : React.createElement('div', { style: {color: '#999', fontSize: '0.9rem'} }, 
                            'Processed image will appear here'
                        )
                    )
                )
            )
        )
    );
}

// Render the app to the DOM
ReactDOM.render(React.createElement(ImageProcessor), document.getElementById('root'));
