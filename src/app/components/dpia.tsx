'use client'

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Box, Checkbox, TextField, Tab } from "@mui/material";
import { useEffect, useState } from 'react'
import axios from 'axios';
import { pdfjs, Document, Page } from 'react-pdf';
import PDFView from "./view";
import Report from "./report";

import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FolderIcon from '@mui/icons-material/Folder';
import Grid from '@mui/material/Grid';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  
import React from 'react';


interface DpiaProps {
  token: string | null;
  projectID: number;
  dpiaFileNames: string[];
  status: string;
  title: string;
  description: string;
  email: string;
}

const Dpia: React.FC<DpiaProps> = ({ email, token, title, description, projectID, dpiaFileNames }) => {

    const [activeTab, setActiveTab] = useState('reports');
    const [dpiaActiveTab, setDpiaActiveTab] = useState('reports');
    const [message, setMessage] = useState<string | null>(null);
    const [taskID, setTaskID] = useState<string>('');
    const [open, setOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
    const [selectedDocName, setSelectedDocName] = useState<string | null>('');

    const [dpias, setDpias] = useState<{ dpiaID: number; title: string; status: string, tempName: string }[]>([]);
    const [selectedDocs, setSelectedDocs] = useState<number[]>([]);
    const [selectedNames, setSelectedNames] = useState<string[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');

    const [openGenerate, setOpenGenerate] = useState<boolean>(false);
    const [dpiaTitle, setDpiaTitle] = useState<string>('');
    // Check if any dictionary in selectedStatus has status 'working'
    const isDisabled = dpias.some(item => item.status === 'working');

    const filteredDpias = dpias.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelectAll = () => {
        if (selectedDocs.length === filteredDpias.length) {
          setSelectedDocs([]);
          setSelectedNames([]);
          setSelectedStatus([]);
        } else {
          setSelectedDocs(filteredDpias.map(doc => doc.dpiaID));
          setSelectedNames(filteredDpias.map(doc => doc.title));
          setSelectedStatus(filteredDpias.map(doc => doc.status));
        }
      };
      

    const handleGenerate = () => {
        setOpenGenerate(true);
    };

    const closeGenerate = () => {
        setOpenGenerate(false);
    };

    const handleDpiaStart = async () => {

        setMessage('');
        try {
            const init = await axios.post('http://localhost:8080/init_dpia', {
                projectID: projectID,
                title: dpiaTitle,
                fileName: dpiaFileNames
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            fetchDpias();
            const dpiaID = init.data.dpiaID;
            
            try {
                setOpenGenerate(false);
                const res = await axios.post('http://localhost:8080/start_task', {
                    projectID: projectID,
                    title: dpiaTitle,
                    fileName: dpiaFileNames,
                    dpiaID: dpiaID,
                    taskName: 'generate_dpia'
                }, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                setTaskID(res.data['task_id']);

                const generate = await axios.get('http://localhost:8080/get_task_result',
                    {
                        params: {
                            taskID: res.data['task_id'],
                            taskName: 'generate_dpia',
                        },
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    } 
                );

                if (generate) {
                    const resToken = await axios.post('http://localhost:8080/refresh_token',{email: email});
                    if (resToken.data.access_token) {
                      token = resToken.data.access_token;
                    }

                    fetchDpias();
                    setTaskID('');
                }
             
            } catch (error) {
                console.error('Error starting DPIA:', error);
            }
        } catch (error) {
            console.error('Error starting DPIA:', error);
            setMessage('Check if template and files are selected or filename already exists');
        }
    };
    

    useEffect(() => {
        fetchDpias();
    }, []);

    const fetchDpias = async () => {
        try {
            const res = await axios.get('http://localhost:8080/get_dpias', {params: { projectID: projectID }, 
                headers: {
                'Authorization': `Bearer ${token}`
            }
        });
            setDpias(res.data);
        } catch (error) {
            console.error('Error fetching documents:', error);
        }
    };

    const handleDpiaDelete = async () => {
        try {
            const res = await axios.post('http://localhost:8080/delete_dpias', selectedDocs, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });
            if (taskID) {
                const cancel = await axios.post('http://localhost:8080/cancel_task', { taskID: taskID },
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                );
            }
            fetchDpias(); // Refresh the document list
            setSelectedDocs([]); // Clear the selected documents

        } catch (error) {
            console.error('Error deleting documents:', error);
        }
    };

    const handleView = async (dpiaID: number, title: string,) => {
        setOpen(true);
        setSelectedDocName(title);

        const res = await axios.get(`http://localhost:8080/view_dpias/${dpiaID}?projectID=${projectID}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        setSelectedDoc(url);

    };

    const handleClose = () => {
        setOpen(false);
    };


    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>, doc: { dpiaID: number; title: string; status: string }) => {
        if (event.target.checked) {
            setSelectedDocs([...selectedDocs, doc.dpiaID]);
            setSelectedNames([...selectedNames, doc.title]);
            setSelectedStatus([...selectedStatus, doc.status]);
        } else {
            setSelectedDocs(selectedDocs.filter(id => id !== doc.dpiaID));
            setSelectedNames(selectedNames.filter(name => name !== doc.title));
            setSelectedStatus(selectedStatus.filter(status => status !== doc.status));
        }
    };

    const handleDownload = async () => {
        for (let i = 0; i < selectedDocs.length; i++) {
            const dpiaID = selectedDocs[i];
            const dpiaName = selectedNames[i];
            const res = await axios.get(`http://localhost:8080/dpia_download/${dpiaID}?projectID=${projectID}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                responseType: 'blob',
            });
            console.log(dpiaName)
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${dpiaName}.pdf`); // 
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // search logics
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(event.target.value);
    };
    
    console.log('TEST', dpias)

    return (
        <main className="flex flex-col w-full h-screen max-h-dvh bg-background">

            <div className="sticky top-0" style={{zIndex: 101}}>
            <Box bgcolor="#ededed" borderRadius={2}>
                {dpiaActiveTab === 'reports' && (
                <>
                <header className="p-4 border-b w-full max-w-3xl mx-auto">
                    <h1 className="text-2xl font-bold">Project: {title}</h1>
                    <h2>{description}</h2>
                </header>
                <Tab onClick={() => {setActiveTab('files'); setDpiaActiveTab('files')}} label='Files' style={{ backgroundColor: activeTab === 'files' ? '#1c1d1f' : 'transparent',
                    color: activeTab === 'files' ? 'white' : 'black' }}></Tab>
                <Tab onClick={() => {setActiveTab('reports'); setDpiaActiveTab('reports')}} label='Dpias' style={{ backgroundColor: activeTab === 'reports' ? '#1c1d1f' : 'transparent',
                    color: activeTab === 'reports' ? 'white' : 'black' }}></Tab>   
                </>
                )} 


                {activeTab === 'reports' && (
                <Box className="p-4" bgcolor="#ededed"> 
                <TextField
                    label="Search Dpias"
                    color="primary"
                    variant="outlined"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    fullWidth
                    style={{ margin: '15px 0', }}
                />

                    <Box display="flex" alignItems="center">
                        <Button onClick={handleGenerate} variant="contained" color="success" disabled={isDisabled}>Generate</Button>

                        {filteredDpias.length > 0 && (
                        <div>
                        <Button onClick={handleSelectAll} variant="contained" color="secondary" style={{ marginLeft: '20px' }}>
                            {selectedDocs.length === filteredDpias.length ? 'Deselect All' : 'Select All'}
                        </Button>
                        {selectedDocs.length > 0 && (
                        <Button variant="outlined" color="secondary" onClick={handleDpiaDelete} style={{ marginLeft: '20px' }}>
                            Delete
                        </Button>
                        )}
                        {selectedDocs.length > 0 && selectedStatus.every(status => status == 'completed') && (
                        <Button variant="outlined" color="primary" onClick={handleDownload} style={{ marginLeft: '20px' }}>
                            Download
                        </Button>
                        )}
                        </div>
                        )}
                    </Box>
                </Box>
                )}
                </Box>
                </div>

                {activeTab === 'reports' ? (
                <div className="p-4">
                <Grid item xs={12}>
                    <List>
                    {filteredDpias.map(doc => (
                    <Box bgcolor="#e0e0e0" p={0.5} borderRadius={0.5}>
                        <ListItem key={doc.dpiaID} className="flex justify-between items-center"
                            style={{ backgroundColor: '#ffffff', // White background for each item
                                borderRadius: '4px', // Rounded corners for each item
                                boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.1)', // Light shadow to make items stand out
                                justifyContent: 'space-between',
                                margin: '5px 5px',
                                width: 'auto',
                                alignItems: 'center', }}
                        >
                        <Checkbox
                            checked={selectedDocs.includes(doc.dpiaID)}
                            onChange={(event) => handleCheckboxChange(event, doc)}
                        />
                            <ListItemIcon>
                                <AssignmentIcon fontSize="large"/>
                            </ListItemIcon>
                            <ListItemText
                                primary={doc.title}
                                secondary={'Template: ' + doc.tempName}
                            />
                            {doc.status == 'working' && (
                                <img src='/loading-gif.gif' alt="GIF" style={{width:'30px', height:'30px', marginRight: '15px'}}/>
                            )}
                            <div >
                                {doc.status == 'working' ? (
                                    <h1>Processing, please wait...</h1>
                                ) : (
                                    <Button onClick={() => handleView(doc.dpiaID, doc.title)} variant="contained" color="primary" style={{ marginRight: '10px' }}>View</Button>
                                )}
                            </div>
                        </ListItem>
                    </Box>
                    ))}
                    </List>
                    </Grid>
                </div>
            ) : (
                <Report email={email} token={token} title={title} description={description} projectID={projectID} />
            )}


            <Dialog open={open} onClose={handleClose}  fullWidth maxWidth="lg">
                <DialogTitle>{selectedDocName}</DialogTitle>
                <DialogContent>
                    <PDFView fileLocation={selectedDoc} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="primary">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openGenerate} onClose={closeGenerate}>
            <DialogTitle>Create DPIA</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Project Title"
                    required
                    fullWidth
                    value={dpiaTitle}
                    onChange={(e) => setDpiaTitle(e.target.value)}
                />
            <List>
                <h1>Selected Files For DPIA: </h1>
                {dpiaFileNames.map((title, index) => (
                    <ListItem key={index}>
                        <ListItemIcon>
                            <FolderIcon />
                        </ListItemIcon>
                        <ListItemText primary={title} />
                    </ListItem>
                ))}
            </List>
            </DialogContent>
            <p>{message}</p>
            <DialogActions>
                <Button onClick={closeGenerate}>Cancel</Button>
                <Button onClick={handleDpiaStart} color="primary">Start</Button>
            </DialogActions>
            </Dialog>        
        </main>
    );

}

export default Dpia;