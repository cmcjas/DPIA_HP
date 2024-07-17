'use client'

import { Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Box } from "@mui/material";
import { useRef, useEffect, useState } from 'react'
import axios from 'axios';
import Select, { SelectChangeEvent } from '@mui/material/Select';

import useToken from '../auth/token';

export function Template() {

    const [templates, setTemplates] = useState<{ tempName: string, tempData : string}[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [error, setError] = useState(false);

    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const { token, removeToken, setToken } = useToken();

    const chatParent = useRef<HTMLUListElement>(null)
    useEffect(() => {
        const domNode = chatParent.current
        if (domNode) {
            domNode.scrollTop = domNode.scrollHeight
        }
    })

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const res = await axios.get('http://localhost:8080/get_templates', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
                });
                setTemplates(res.data);
                if (res.data.access_token) {
                    const new_token = res.data.access_token
                    setToken(new_token)
                }
            } catch (err) {
                setError(error);
            }
            };
        fetchTemplates();
    }, [error, open, token]);

    const handleSelectChange = (event: SelectChangeEvent<unknown>) => {
        setSelectedTemplate(event.target.value as string);
    };


    const selectedTemplateData = templates.find(template => template.tempName === selectedTemplate)?.tempData??'';
    
    let templateData: Record<string, Record<string, string>> = {};
    templateData = {} as Record<string, Record<string, string>>;

    const [editableData, setEditableData] = useState(templateData);
    
    // Parse the JSON string to a JavaScript object
    if (selectedTemplateData === '') {
        console.log('No template selected');
    } else {
        templateData = JSON.parse(selectedTemplateData);
    }

    const saveTemplateData = async () => {
        try {
            const res = await axios.post('http://localhost:8080/select_template', editableData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`

                }
            });

            if (res) {
                if (res.data.access_token) {
                    const new_token = res.data.access_token
                    setToken(new_token)
                }
                console.log('Template data saved successfully.');
            } else {
                console.error('Failed to save template data.');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    useEffect(() => {
        setEditableData(templateData);
        saveTemplateData();
    }, [selectedTemplateData]);

    useEffect(() => {
        saveTemplateData();
    }, [editableData]);


    const handleAddPart = (step: string, title: string) => {
        // Create a copy of the current editableData
        const updatedData = { ...editableData };
    
        // Create an array of titles, sorted to maintain order
        const titles = Object.keys(updatedData[step]);
        const index = titles.indexOf(title);

        // Create a unique title for the new part
        let newTitleIndex = 1;
        let newTitle = `New Title ${newTitleIndex}`;
        while (titles.includes(newTitle)) {
            newTitleIndex++;
            newTitle = `New Title ${newTitleIndex}`;
        }

        // Insert the new part immediately after the current title
        const newTitles = [
            ...titles.slice(0, index + 1),
            newTitle,
            ...titles.slice(index + 1),
        ];

        // Create a new sections object with the new title inserted
        const newSections: Record<string, string> = {};
        newTitles.forEach((title) => {
            newSections[title] = updatedData[step][title] || '';
        });

        // Set the default prompt value for the new title
        newSections[newTitle] = '';

        // Update the step with the new sections
        updatedData[step] = newSections;
    
        // Update the state with the new data
        setEditableData(updatedData);
    };

    const handleDeletePart = (step: string, title: string) => {
        // Create a copy of the current editableData
        const updatedData = { ...editableData };

        const titles = Object.keys(updatedData[step]);

        if (titles.length > 1) {
            // Delete the specified title
            delete updatedData[step][title];
        }

        // Update the state with the new data
        setEditableData(updatedData);
    };


    const handleAddStep = (step: string) => {
        // Create a copy of the current editableData
        const updatedData = { ...editableData };
    
        // Parse the step number from the current step string
        const stepMatch = step.match(/Step\s(\d+)/);
        const currentStepNumber = stepMatch ? parseInt(stepMatch[1], 10) : NaN;
    
        // Create a new step to add
        const newStepNumber = isNaN(currentStepNumber) ? 'NaN' : currentStepNumber + 1;
    
        // Get all step keys
        const stepKeys = Object.keys(updatedData);
    
        // Insert the new step and shift subsequent steps
        const newUpdatedData: Record<string, Record<string, string>> = {};
        let stepInserted = false;
    
        for (let i = 0; i < stepKeys.length; i++) {
            const oldStepMatch = stepKeys[i].match(/(Step\s\d+)(.*)/);
            if (oldStepMatch) {
                const oldStepNumber = parseInt(oldStepMatch[1].replace('Step ', ''), 10);
                const suffix = oldStepMatch[2];
    
                if (oldStepNumber === currentStepNumber && !stepInserted) {
                    // Insert the new step right after the current step
                    newUpdatedData[`Step ${oldStepNumber}${suffix}`] = updatedData[stepKeys[i]];
                    newUpdatedData[`Step ${newStepNumber} - `] = { 'Role': '' };
                    stepInserted = true;
                } else if (oldStepNumber > currentStepNumber) {
                    // Shift the subsequent steps
                    newUpdatedData[`Step ${oldStepNumber + 1}${suffix}`] = updatedData[stepKeys[i]];
                } else {
                    newUpdatedData[stepKeys[i]] = updatedData[stepKeys[i]];
                }
            } else {
                // Preserve non-standard step names
                newUpdatedData[stepKeys[i]] = updatedData[stepKeys[i]];
                if (stepKeys[i] === step && !stepInserted) {
                    // Insert the new step after the non-standard step
                    newUpdatedData[`Step ${newStepNumber}`] = { 'Role': '' };
                    stepInserted = true;
                }
            }
        }
    
        // If the new step was not inserted (in case the current step number is the highest or non-standard), add it at the end
        if (!stepInserted) {
            newUpdatedData[`Step ${newStepNumber}`] = { 'Role': '' };
        }
    
        // Update the state with the new data
        setEditableData(newUpdatedData);
    };


    const handleDeleteStep = (step: string) => {
        // Create a copy of the current editableData
        const updatedData = { ...editableData };
    
        // Check if there is only one step left
        if (Object.keys(updatedData).length === 1) {
            return; // Do not delete if there is only one step left
        }
    
        // Delete the specified step
        delete updatedData[step];
    
        // Separate non-standard steps from standard 'Step X' steps
        const nonStandardSteps: Record<string, Record<string, string>> = {};
        const standardSteps: Record<string, Record<string, string>> = {};
        const originalOrder: string[] = Object.keys(editableData);
    
        Object.keys(updatedData).forEach((key) => {
            if (key.startsWith('Step ')) {
                standardSteps[key] = updatedData[key];
            } else {
                nonStandardSteps[key] = updatedData[key];
            }
        });
    
        // Reorder the remaining standard 'Step X' steps while keeping the suffix
        const reorderedSteps: Record<string, Record<string, string>> = {};
        let mainStepCounter = 1;
        let subStepCounters: Record<number, number> = {};
    
        Object.keys(standardSteps).forEach((key) => {
            const match = key.match(/(Step\s\d+)(\.\d+)?(.*)/);
            if (match) {
                const mainStepNumber = parseInt(match[1].replace('Step ', ''), 10);
                const subStepNumber = match[2] ? parseInt(match[2].replace('.', ''), 10) : null;
                const suffix = match[3];
    
                if (subStepNumber === null) {
                    // This is a main step
                    reorderedSteps[`Step ${mainStepCounter}${suffix}`] = standardSteps[key];
                    subStepCounters[mainStepCounter] = 1; // Initialize sub-step counter for this main step
                    mainStepCounter++;
                } else {
                    // This is a sub-step
                    const parentStepNumber = mainStepCounter - 1; // Attach to the last main step
                    reorderedSteps[`Step ${parentStepNumber}.${subStepCounters[parentStepNumber]}${suffix}`] = standardSteps[key];
                    subStepCounters[parentStepNumber]++;
                }
            }
        });
    
        // Merge reordered steps and non-standard steps back into the original order
        const finalData: Record<string, Record<string, string>> = {};
    
        originalOrder.forEach((key) => {
            if (nonStandardSteps[key]) {
                finalData[key] = nonStandardSteps[key];
            } else {
                const reorderedKey = Object.keys(reorderedSteps).find((rk) => reorderedSteps[rk] === updatedData[key]);
                if (reorderedKey) {
                    finalData[reorderedKey] = reorderedSteps[reorderedKey];
                }
            }
        });
    
        // Update the state with the new data
        setEditableData(finalData);
    };
    

    const [openTitle, setOpenTitle] = useState(false);
    const [currentStep, setCurrentStep] = useState<string | null>(null);
    const [currentTitle, setCurrentTitle] = useState('');
    const [newTitle, setNewTitle] = useState('');

    const [openStep, setOpenStep] = useState(false);
    const [newStep, setNewStep] = useState('');

    const handleOpenTitle = (step: string, title: string) => {
        setCurrentStep(step);
        setCurrentTitle(title);
        setNewTitle(title);
        setOpenTitle(true);
      };
    
    const handleCloseTitle = () => {
    setOpenTitle(false);
    setCurrentStep(null);
    setCurrentTitle('');
    setNewTitle('');
    };

    const handleOpenStep = (step: string) => {
        setOpenStep(true);
        setCurrentStep(step);
        setNewStep(step);
    }

    const handleCloseStep = () => {
        setOpenStep(false);
        setCurrentStep(null);
        setNewStep('');
    }

    const handleTitleSubmit = () => {
    if (currentStep && currentTitle) {
        setEditableData(prevData => {
        const updatedData = { ...prevData };
        const stepData = updatedData[currentStep];
        const newSection = JSON.stringify(stepData).split(`"${currentTitle}":`).join(`"${newTitle}":`)
        updatedData[currentStep] = JSON.parse(newSection);
        
        return updatedData;
        });
    }
    handleCloseTitle();
    };

    const handleStepSubmit = () => {
        if (currentStep) {
            setEditableData(prevData => {
                const updatedData = { ...prevData };
                const newStepSection = JSON.stringify(updatedData).split(`"${currentStep}":`).join(`"${newStep}":`);
                return JSON.parse(newStepSection);
            });

        }
        handleCloseStep();
    }

    const handlePromptChange = (step: string, title: string, newPrompt: string) => {
        setEditableData(prevData => {
            const newData = { ...prevData };
            newData[step][title] = newPrompt;
            return newData;
        });
    };


    const handleClickOpen = () => {
        setOpen(true);
      };
    
      const handleClose = () => {
        setOpen(false);
        setError(false);
      };
    
      const handleSave = async () => {
        if (name.trim() === '') {
          setError(true);
          return;
        }
    
        const res = await axios.post('http://localhost:8080/save_template', { tempName: name }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
    
        if (res) {
            if (res.data.access_token) {
                const new_token = res.data.access_token
                setToken(new_token)
            }
          // handle success
          handleClose();
        } else {
          // handle error
        }
      };


      const handleDelete = async () => {
        setError(true);
        const res = await axios.post('http://localhost:8080/delete_template', selectedTemplate, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
            },
        });
        if (res) {
            setError(false);
            if (res.data.access_token) {
                const new_token = res.data.access_token
                setToken(new_token)
            }

        }
      }


    return (
        <main className="flex flex-col w-full h-screen max-h-dvh bg-background">

            <header className="p-4 border-b w-full h-16 bg-gradient-to-r from-purple-500 to-pink-500">
                <h1 className="text-3xl font-bold">TEMPLATE</h1>
            </header>

            <section className="p-4 flex-1 overflow-auto" ref={chatParent}>
            <div>
                <h1 className="text-1xl font-bold">Choose a Template</h1>
                <Select value={selectedTemplate} label="Template" onChange={handleSelectChange}>
                    <MenuItem value="">None...</MenuItem>
                    {templates.map(template => (
                    <MenuItem key={template.tempName} value={template.tempName}>
                        {template.tempName}
                    </MenuItem>
                    ))}
                </Select>

                {selectedTemplate && selectedTemplateData && (
                    <div>
                    {Object.entries(editableData).map(([step, sections]) => (
                    <div key={step}>
                        <Box bgcolor="#e0e0e0" p={3} borderRadius={4} style={{ marginTop: '20px' }}>
                        <Button
                            variant="contained"
                            onClick={() => handleOpenStep(step)}
                            fullWidth
                        >
                            {step}
                        </Button>
                        <Button variant="outlined" onClick={() => handleAddStep(step)}>Add Step</Button>
                        <Button variant="outlined" onClick={() => handleDeleteStep(step)}>Delete Step</Button>
                        {Object.entries(sections).map(([title, prompt], index) => (
                        <div key={title} style={{ marginBottom: '1rem' }}>
                                <Button
                                    variant="outlined"
                                    onClick={() => handleOpenTitle(step, title)}
                                    fullWidth
                                    style={{ marginBottom: '0.5rem' }}
                                >
                                    {title}
                                </Button>
                                <TextField
                                    label="Prompt"
                                    value={prompt}
                                    variant="outlined"
                                    onChange={(e) => handlePromptChange(step, title, e.target.value)}
                                    fullWidth
                                    multiline
                                />
                            <Button variant="outlined" onClick={() => handleAddPart(step, title)}>Add Part</Button>
                            <Button variant="outlined" onClick={() => handleDeletePart(step, title)}>Delete Part</Button>
                        </div>
                        ))}
                        </Box>

                        <Dialog open={openTitle} onClose={handleCloseTitle}>
                                <DialogTitle>Enter a new Title:</DialogTitle>
                                <DialogContent>
                                <TextField
                                    autoFocus
                                    margin="dense"
                                    type="text"
                                    fullWidth
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                />
                                </DialogContent>
                                <DialogActions>
                                <Button onClick={handleCloseTitle} color="primary">
                                    Cancel
                                </Button>
                                <Button onClick={handleTitleSubmit} color="primary">
                                    Submit
                                </Button>
                                </DialogActions>
                        </Dialog>

                        <Dialog open={openStep} onClose={handleCloseStep}>
                                <DialogTitle>Enter a new Step:</DialogTitle>
                                <DialogContent>
                                <TextField
                                    autoFocus
                                    margin="dense"
                                    type="text"
                                    fullWidth
                                    value={newStep}
                                    onChange={(e) => setNewStep(e.target.value)}
                                />
                                </DialogContent>
                                <DialogActions>
                                <Button onClick={handleCloseStep} color="primary">
                                    Cancel
                                </Button>
                                <Button onClick={handleStepSubmit} color="primary">
                                    Submit
                                </Button>
                                </DialogActions>
                        </Dialog>

                        <Dialog open={open} onClose={handleClose}>
                            <DialogTitle>Enter a Name</DialogTitle>
                            <DialogContent>
                            <TextField
                                autoFocus
                                margin="dense"
                                label="Template Name"
                                fullWidth
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                error={error}
                                helperText={error ? "Name cannot be empty" : ""}
                            />
                            </DialogContent>
                            <DialogActions>
                            <Button onClick={handleClose} color="secondary">
                                Cancel
                            </Button>
                            <Button onClick={handleSave} color="primary">
                                Save
                            </Button>
                            </DialogActions>
                        </Dialog>
                    </div>
                    ))}
                </div>
                )}
            </div>
            {selectedTemplate && selectedTemplateData && (
            <div style={{marginTop:'15px'}}>
            <Button variant="contained" color="success" onClick={handleClickOpen}>
                Save
            </Button>
            <Button variant="outlined" onClick={handleDelete} color="secondary" style={{marginLeft: '10px'}}>
                Delete
            </Button>
            </div>
            )}
            </section>
        </main>
    )

}