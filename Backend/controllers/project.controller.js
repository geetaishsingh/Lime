const getProjects = (req, res) => {
    res.send("All Projects");
};

const addProject = (req, res) => {
    res.send("Project Added");
};

export { getProjects, addProject };