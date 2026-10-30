using UnityEngine;

// Conectar una sola vez cada evento Hover/Select del XR Grab Interactable.
public class XRVisualFeedback : MonoBehaviour
{
    [SerializeField] private Renderer targetRenderer;
    [SerializeField] private Material defaultMaterial;
    [SerializeField] private Material hoverMaterial;
    [SerializeField] private Material selectedMaterial;

    // Contar los interactores evita perder el estado cuando una de las manos sale.
    private int hoverCount;
    private int selectCount;

    private void Awake()
    {
        if (targetRenderer == null)
            targetRenderer = GetComponentInChildren<Renderer>();
        if (defaultMaterial == null && targetRenderer != null)
            defaultMaterial = targetRenderer.sharedMaterial;
    }

    private void OnEnable()
    {
        hoverCount = 0;
        selectCount = 0;
        RefreshMaterial();
    }

    public void OnHoverEnter()
    {
        hoverCount++;
        RefreshMaterial();
    }

    public void OnHoverExit()
    {
        if (hoverCount > 0) hoverCount--;
        RefreshMaterial();
    }

    public void OnSelectEnter()
    {
        selectCount++;
        RefreshMaterial();
    }

    public void OnSelectExit()
    {
        if (selectCount > 0) selectCount--;
        RefreshMaterial();
    }

    private void RefreshMaterial()
    {
        // Prioridad: seleccionado > hover > normal.
        Material nextMaterial = defaultMaterial;
        if (selectCount > 0)
            nextMaterial = selectedMaterial;
        else if (hoverCount > 0)
            nextMaterial = hoverMaterial;

        if (targetRenderer != null && nextMaterial != null)
            targetRenderer.sharedMaterial = nextMaterial;
    }
}
